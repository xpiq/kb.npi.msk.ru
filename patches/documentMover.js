"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _sequelize = require("sequelize");
const _tracing = require("../logging/tracing");
const _models = require("../models");
async function documentMover(ctx, { document, collectionId, parentDocumentId = null, // convert undefined to null so parentId comparison treats them as equal
index }) {
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    const collectionChanged = collectionId !== document.collectionId;
    const previousCollectionId = document.collectionId;
    const result = {
        collections: [],
        documents: [],
        collectionChanged
    };
    // Load the current and the next collection upfront and lock them
    const collection = await _models.Collection.findByPk(document.collectionId, {
        includeDocumentStructure: true,
        transaction,
        lock: _sequelize.Transaction.LOCK.NO_KEY_UPDATE,
        paranoid: false
    });
    let newCollection = collection;
    if (collectionChanged && collectionId) {
        newCollection = await _models.Collection.findByPk(collectionId, {
            includeDocumentStructure: true,
            transaction,
            lock: _sequelize.Transaction.LOCK.NO_KEY_UPDATE
        });
    } else if (!collectionId) {
        newCollection = null;
    }
    if (document.publishedAt) {
        // Remove the document from the current collection
        const response = await collection?.removeDocumentInStructure(document, {
            transaction,
            save: collectionChanged
        });
        let documentJson = response?.[0];
        const fromIndex = response?.[1] || 0;
        if (!documentJson) {
            documentJson = await document.toNavigationNode({
                transaction
            });
        }
        // if we're reordering from within the same parent
        // the original and destination collection are the same,
        // so when the initial item is removed above, the list will reduce by 1.
        // We need to compensate for this when reordering
        const toIndex = index !== undefined && document.parentDocumentId === parentDocumentId && document.collectionId === collectionId && fromIndex < index ? index - 1 : index;
        // Update the properties on the document record, this must be done after
        // the toIndex is calculated above
        document.collectionId = collectionId;
        document.parentDocumentId = parentDocumentId;
        document.lastModifiedById = user.id;
        document.updatedBy = user;
        if (newCollection) {
            // Add the document and it's tree to the new collection
            await newCollection.addDocumentToStructure(document, toIndex, {
                documentJson,
                transaction
            });
        }
    } else {
        document.collectionId = collectionId;
        document.parentDocumentId = parentDocumentId;
        document.lastModifiedById = user.id;
        document.updatedBy = user;
    }
    if (collection && document.publishedAt) {
        result.collections.push(collection);
    }
    // If the collection has changed then we also need to update the properties
    // on all of the documents children to reflect the new collectionId
    if (collectionChanged) {
        // Efficiently find the ID's of all the documents that are children of
        // the moved document and update in one query
        const childDocumentIds = await document.findAllChildDocumentIds();
        if (collectionId) {
            // Reload the collection to get relationship data
            newCollection = await _models.Collection.findByPk(collectionId, {
                userId: user.id,
                includeDocumentStructure: true,
                rejectOnEmpty: true,
                transaction
            });
            result.collections.push(newCollection);
            await _models.Document.update({
                collectionId: newCollection.id
            }, {
                transaction,
                where: {
                    id: childDocumentIds
                }
            });
        } else {
            // document will be moved to drafts
            document.publishedAt = null;
            // point children's parent to moved document's parent
            await _models.Document.update({
                parentDocumentId: document.parentDocumentId
            }, {
                transaction,
                where: {
                    id: childDocumentIds
                }
            });
        }
        // We must reload from the database to get the relationship data
        const documents = await _models.Document.findAll({
            where: {
                id: childDocumentIds
            },
            transaction
        });
        document.collection = newCollection;
        result.documents.push(...documents.map((doc)=>{
            if (newCollection) {
                doc.collection = newCollection;
            }
            return doc;
        }));
        // If the document was pinned to the collection then we also need to
        // automatically remove the pin to prevent a confusing situation where
        // a document is pinned from another collection. Use the command to ensure
        // the correct events are emitted.
        const pin = await _models.Pin.findOne({
            where: {
                documentId: document.id,
                collectionId: previousCollectionId
            },
            transaction,
            lock: _sequelize.Transaction.LOCK.UPDATE
        });
        await pin?.destroyWithCtx(ctx);
    }
    result.documents.push(document);
    const eventCtx = Object.create(ctx);
    Object.defineProperty(eventCtx, "context", {
        configurable: true,
        get () {
            return {
                ...ctx.context,
                transaction
            };
        }
    });
    await document.saveWithCtx(eventCtx, undefined, {
        name: "move",
        data: {
            collectionIds: result.collections.map((c)=>c.id),
            documentIds: result.documents.map((d)=>d.id)
        }
    });
    // we need to send all updated models back to the client
    return result;
}
const _default = (0, _tracing.traceFunction)({
    spanName: "documentMover"
})(documentMover);
