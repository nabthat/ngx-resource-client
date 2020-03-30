var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { DocumentResource } from './../document-resource';
import { DexieDataProvider } from '../data-providers/dexie-data-provider';
import { DocumentCollection } from '../document-collection';
export class JsonRipper {
    constructor() {
        this.dataProvider = new DexieDataProvider();
    }
    getResource(key, include = []) {
        return __awaiter(this, void 0, void 0, function* () {
            let stored_resource = (yield this.getDataResources([key])).shift();
            if (stored_resource === undefined) {
                throw new Error(`Resource ${key} don't found.`);
            }
            if (include.length === 0) {
                return stored_resource;
            }
            let included_keys = [];
            include.forEach(relationship_alias => {
                // @NOTE: typescript doesn't detect throwError added a few lines above when stored_resource === undefnied
                if (!stored_resource || !stored_resource.data.relationships || !stored_resource.data.relationships[relationship_alias]) {
                    // this is a classic problem when relationship property is missing on included resources
                    throw new Error('We dont have relation_alias on stored data resource');
                }
                const relationship = stored_resource.data.relationships[relationship_alias].data;
                if (relationship instanceof Array) {
                    relationship.forEach(related_resource => {
                        included_keys.push(JsonRipper.getResourceKey(related_resource));
                    });
                }
                else if (relationship && 'id' in relationship) {
                    included_keys.push(JsonRipper.getResourceKey(relationship));
                }
            });
            let included_resources = yield this.getDataResources(included_keys);
            return Object.assign(Object.assign({}, stored_resource), { included: included_resources.map(document_resource => document_resource.data) });
        });
    }
    getCollection(url, include = []) {
        return __awaiter(this, void 0, void 0, function* () {
            let stored_collection = yield this.getDataCollection(url);
            let data_resources = yield this.getDataResources(stored_collection.keys);
            let ret = {
                data: data_resources.map(data_resource => data_resource.data),
                cache_last_update: stored_collection.updated_at
            };
            if (include.length === 0) {
                return ret;
            }
            let included_keys = [];
            include.forEach(relationship_alias => {
                data_resources.forEach(resource => {
                    if (!resource.data.relationships || !resource.data.relationships[relationship_alias]) {
                        return;
                    }
                    const relationship = resource.data.relationships[relationship_alias].data;
                    if (relationship instanceof Array) {
                        relationship.forEach(related_resource => {
                            included_keys.push(JsonRipper.getResourceKey(related_resource));
                        });
                    }
                    else if ('id' in relationship) {
                        included_keys.push(JsonRipper.getResourceKey(relationship));
                    }
                });
            });
            let included_resources = yield this.getDataResources(included_keys);
            return Object.assign(Object.assign({}, ret), { included: included_resources.map(document_resource => document_resource.data) });
        });
    }
    getDataCollection(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dataProvider.getElement(url, 'collections');
        });
    }
    getDataResources(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dataProvider.getElements(keys, 'elements');
        });
    }
    saveCollection(url, collection, include = []) {
        this.dataProvider.saveElements(JsonRipper.collectionToElement(url, collection), 'collections');
        this.dataProvider.saveElements(JsonRipper.collectionResourcesToElements(collection, include), 'elements');
    }
    saveResource(resource, include = []) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dataProvider.saveElements(JsonRipper.toResourceElements(JsonRipper.getResourceKey(resource), resource, include), 'elements');
        });
    }
    static collectionToElement(url, collection) {
        let collection_element = {
            key: url,
            content: { updated_at: Date.now(), keys: [] }
        };
        collection.data.forEach(resource => {
            let key = JsonRipper.getResourceKey(resource);
            collection_element.content.keys.push(key);
        });
        return [collection_element];
    }
    static collectionResourcesToElements(collection, include = []) {
        let elements = [];
        collection.data.forEach(resource => {
            let key = JsonRipper.getResourceKey(resource);
            elements.push(...JsonRipper.toResourceElements(key, resource, include));
        });
        return elements;
    }
    static toResourceElements(key, resource, include = []) {
        let elements = [
            {
                key: key,
                content: resource.toObject()
            }
        ];
        elements[0].content.data.cache_last_update = Date.now();
        include.forEach(relationship_alias => {
            const relationship = resource.relationships[relationship_alias];
            if (relationship instanceof DocumentCollection) {
                relationship.data.forEach(related_resource => {
                    elements.push(JsonRipper.getElement(related_resource));
                });
            }
            else if (relationship instanceof DocumentResource) {
                if (relationship.data === null || relationship.data === undefined) {
                    return;
                }
                elements.push(JsonRipper.getElement(relationship.data));
            }
        });
        return elements;
    }
    static getResourceKey(resource) {
        return resource.type + '.' + resource.id;
    }
    static getElement(resource) {
        return {
            key: JsonRipper.getResourceKey(resource),
            content: resource.toObject()
        };
    }
    deprecateCollection(key_start_with) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.dataProvider.updateElements(key_start_with, {}, 'collections');
        });
    }
}
//# sourceMappingURL=json-ripper.js.map