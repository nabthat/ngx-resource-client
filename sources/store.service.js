var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Dexie from 'dexie';
import { Injectable } from '@angular/core';
import * as i0 from "@angular/core";
export class StoreService /* implements IStoreService */ {
    constructor() {
        this.db = new Dexie('jsonapi_db');
        this.db.version(1).stores({
            collections: '',
            elements: ''
        });
        this.checkIfIsTimeToClean();
    }
    getDataObject(type, id_or_url) {
        return __awaiter(this, void 0, void 0, function* () {
            // we use different tables for resources and collections
            const table_name = type === 'collection' ? 'collections' : 'elements';
            yield this.db.open();
            let item = yield this.db.table(table_name).get(type + '.' + id_or_url);
            if (item === undefined) {
                throw new Error();
            }
            return item;
        });
    }
    getDataResources(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.db
                .table('elements')
                .where(':id')
                .anyOf(keys);
            let resources_by_id = {};
            yield collection.each(item => {
                resources_by_id[item.id] = item;
            });
            return resources_by_id;
        });
    }
    saveResource(type, url_or_id, value) {
        let data_resource_storage = Object.assign({ cache_last_update: Date.now() }, value);
        this.db.open().then(() => __awaiter(this, void 0, void 0, function* () {
            return this.db.table('elements').put(data_resource_storage, type + '.' + url_or_id);
        }));
    }
    saveCollection(url_or_id, value) {
        let data_collection_storage = Object.assign({ cache_last_update: Date.now() }, value);
        this.db.open().then(() => __awaiter(this, void 0, void 0, function* () {
            return this.db.table('collections').put(data_collection_storage, 'collection.' + url_or_id);
        }));
    }
    clearCache() {
        this.db.open().then(() => __awaiter(this, void 0, void 0, function* () {
            return this.db
                .table('elements')
                .toCollection()
                .delete();
        }));
        this.db.open().then(() => __awaiter(this, void 0, void 0, function* () {
            return this.db
                .table('collections')
                .toCollection()
                .delete();
        }));
    }
    deprecateResource(type, id) {
        this.db.open().then(() => __awaiter(this, void 0, void 0, function* () {
            return this.db
                .table('elements')
                .where(':id')
                .startsWith(type + '.' + id)
                .modify({ cache_last_update: 0 });
        }));
    }
    deprecateCollection(key_start_with) {
        this.db.open().then(() => __awaiter(this, void 0, void 0, function* () {
            return this.db
                .table('collections')
                .where(':id')
                .startsWith(key_start_with)
                .modify({ cache_last_update: 0 });
        }));
    }
    removeObjectsWithKey(key) {
        return __awaiter(this, void 0, void 0, function* () {
            /*
            this.allstore.removeItem(key);
            await this.allstore.getItems().then(async result => {
                for (let saved_resource_key in result) {
                    let resource_id_split = key.split('.');
                    let resource_id = resource_id_split[resource_id_split.length - 1];
                    if (
                        Array.isArray(result[saved_resource_key].data) &&
                        result[saved_resource_key].data.find(resource => resource.id === resource_id)
                    ) {
                        result[saved_resource_key].data.splice(
                            result[saved_resource_key].data.findIndex(resource => resource.id === resource_id),
                            1
                        );
                        await this.allstore.setItem(saved_resource_key, result[saved_resource_key]);
                    }
                }
            });
            */
        });
    }
    checkIfIsTimeToClean() {
        // check if is time to check cachestore
        /*
        this.globalstore
            .getItem('_lastclean_time')
            .then((success: IStoreElement) => {
                if (Date.now() >= success.time + 12 * 3600 * 1000) {
                    // is time to check cachestore!
                    this.globalstore.setItem('_lastclean_time', {
                        time: Date.now()
                    });
                    this.checkAndDeleteOldElements();
                }
            })
            .catch(() => {
                this.globalstore.setItem('_lastclean_time', {
                    time: Date.now()
                });
            });
        */
    }
    checkAndDeleteOldElements() {
        /*
        this.allstore
            .keys()
            .then(success => {
                Base.forEach(success, key => {
                    // recorremos cada item y vemos si es tiempo de removerlo
                    this.allstore
                        .getItem(key)
                        .then((success2: ICacheableDataCollection | ICacheableDataResource) => {
                            if (Date.now() >= success2.cache_last_update + 24 * 3600 * 1000) {
                                this.allstore.removeItem(key);
                            }
                        })
                        .catch(noop);
                });
            })
            .catch(noop);
        */
    }
}
StoreService.ɵfac = function StoreService_Factory(t) { return new (t || StoreService /* implements IStoreService */)(); };
StoreService.ɵprov = i0.ɵɵdefineInjectable({ token: StoreService /* implements IStoreService */, factory: StoreService /* implements IStoreService */.ɵfac });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(StoreService /* implements IStoreService */, [{
        type: Injectable
    }], function () { return []; }, null); })();
//# sourceMappingURL=store.service.js.map