var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { JsonRipper } from './services/json-ripper';
import { CacheMemory } from './services/cachememory';
import { Injectable, isDevMode } from '@angular/core';
import { serviceIsRegistered } from './common';
import { PathBuilder } from './services/path-builder';
import { JsonapiInjector } from './services/jsonapi-injector';
import { Resource } from './resource';
import { JsonapiConfig } from './jsonapi-config';
import { Http as JsonapiHttpImported } from './sources/http.service';
import { StoreService as JsonapiStore } from './sources/store.service';
import { throwError, noop } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import * as i0 from "@angular/core";
export class Core {
    constructor() {
        this.loadingsCounter = 0;
        this.loadingsStart = noop;
        this.loadingsDone = noop;
        this.loadingsError = noop;
        this.loadingsOffline = noop;
        this.resourceServices = {};
        this.config = new JsonapiConfig();
        let user_config = JsonapiInjector.get(JsonapiConfig);
        let jsonapiStoreService = JsonapiInjector.get(JsonapiStore);
        let jsonapiHttp = JsonapiInjector.get(JsonapiHttpImported);
        for (let k in this.config) {
            this.config[k] = user_config[k] !== undefined ? user_config[k] : this.config[k];
        }
        Core.me = this;
        Core.injectedServices = {
            JsonapiStoreService: jsonapiStoreService,
            JsonapiHttp: jsonapiHttp,
            rsJsonapiConfig: this.config
        };
    }
    setHttpClient(http) {
        Core.injectedServices.JsonapiHttp.setHttpClient(http);
    }
    static delete(path) {
        return Core.exec(path, 'DELETE');
    }
    static get(path) {
        return Core.exec(path, 'get');
    }
    static exec(path, method, data, call_loadings_error = true) {
        Core.me.refreshLoadings(1);
        return Core.injectedServices.JsonapiHttp.exec(path, method, data).pipe(
        // map(data => { return data.body }),
        tap(() => Core.me.refreshLoadings(-1)), catchError(error => {
            error = error.error || error;
            Core.me.refreshLoadings(-1);
            if (error.status <= 0) {
                // offline?
                if (!Core.me.loadingsOffline(error) && isDevMode()) {
                    console.warn('Jsonapi.Http.exec (use JsonapiCore.loadingsOffline for catch it) error =>', error);
                }
            }
            else if (call_loadings_error && !Core.me.loadingsError(error) && isDevMode()) {
                console.warn('Jsonapi.Http.exec (use JsonapiCore.loadingsError for catch it) error =>', error);
            }
            return throwError(error);
        }));
    }
    registerService(clase) {
        if (clase.type in this.resourceServices) {
            return false;
        }
        this.resourceServices[clase.type] = clase;
        return clase;
    }
    // @todo this function could return an empty value, fix required
    getResourceService(type) {
        return this.resourceServices[type];
    }
    getResourceServiceOrFail(type) {
        let service = this.resourceServices[type];
        if (!service) {
            throw new Error(`The requested service with type ${type} has not been registered, please use register() method or @Autoregister() decorator`);
        }
        return service;
    }
    static removeCachedResource(resource_type, resource_id) {
        CacheMemory.getInstance().removeResource(resource_type, resource_id);
        if (Core.injectedServices.rsJsonapiConfig.cachestore_support) {
            // TODO: FE-85 ---> add method on JsonRipper
        }
    }
    static setCachedResource(resource) {
        CacheMemory.getInstance().setResource(resource, true);
        if (Core.injectedServices.rsJsonapiConfig.cachestore_support) {
            // TODO: FE-85 ---> add method on JsonRipper
        }
    }
    static deprecateCachedCollections(type) {
        let service = Core.me.getResourceServiceOrFail(type);
        let path = new PathBuilder();
        path.applyParams(service);
        CacheMemory.getInstance().deprecateCollections(path.getForCache());
        if (Core.injectedServices.rsJsonapiConfig.cachestore_support) {
            // TODO: FE-85 ---> add method on JsonRipper
        }
    }
    refreshLoadings(factor) {
        this.loadingsCounter += factor;
        if (this.loadingsCounter === 0) {
            this.loadingsDone();
        }
        else if (this.loadingsCounter === 1) {
            this.loadingsStart();
        }
    }
    clearCache() {
        return __awaiter(this, void 0, void 0, function* () {
            Core.injectedServices.JsonapiStoreService.clearCache();
            CacheMemory.getInstance().clearCache();
            let json_ripper = new JsonRipper();
            return json_ripper.deprecateCollection('').then(() => true);
        });
    }
    // just an helper
    duplicateResource(resource, ...relations_alias_to_duplicate_too) {
        let newresource = this.getResourceServiceOrFail(resource.type).new();
        newresource.id = 'new_' + Math.floor(Math.random() * 10000).toString();
        newresource.attributes = Object.assign(Object.assign({}, newresource.attributes), resource.attributes);
        for (const alias in resource.relationships) {
            let relationship = resource.relationships[alias];
            if (!relationship.data) {
                newresource.relationships[alias] = resource.relationships[alias];
                continue;
            }
            if ('id' in relationship.data) {
                // relation hasOne
                if (relations_alias_to_duplicate_too.indexOf(alias) > -1) {
                    newresource.addRelationship(this.duplicateResource(relationship.data), alias);
                }
                else {
                    newresource.addRelationship(relationship.data, alias);
                }
            }
            else {
                // relation hasMany
                if (relations_alias_to_duplicate_too.indexOf(alias) > -1) {
                    relationship.data.forEach(relationresource => {
                        newresource.addRelationship(this.duplicateResource(relationresource), alias);
                    });
                }
                else {
                    newresource.addRelationships(relationship.data, alias);
                }
            }
        }
        return newresource;
    }
}
Core.ɵfac = function Core_Factory(t) { return new (t || Core)(); };
Core.ɵprov = i0.ɵɵdefineInjectable({ token: Core, factory: Core.ɵfac });
__decorate([
    serviceIsRegistered,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], Core, "removeCachedResource", null);
__decorate([
    serviceIsRegistered,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Resource]),
    __metadata("design:returntype", void 0)
], Core, "setCachedResource", null);
__decorate([
    serviceIsRegistered,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], Core, "deprecateCachedCollections", null);
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(Core, [{
        type: Injectable
    }], function () { return []; }, null); })();
//# sourceMappingURL=core.js.map