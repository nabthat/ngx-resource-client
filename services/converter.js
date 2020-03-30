import { CacheMemory } from './cachememory';
// import * as angular from 'angular';
import { Core } from '../core';
import { Resource } from '../resource';
import { isDevMode } from '@angular/core';
export class Converter {
    /*
    Convert json arrays (like included) to an indexed Resources array by [type][id]
    */
    static json_array2resources_array_by_type(json_array) {
        let all_resources = {};
        let resources_by_type = {};
        Converter.json_array2resources_array(json_array, all_resources);
        for (const key in all_resources) {
            let resource = all_resources[key];
            if (!(resource.type in resources_by_type)) {
                resources_by_type[resource.type] = {};
            }
            resources_by_type[resource.type][resource.id] = resource;
        }
        return resources_by_type;
    }
    static json2resource(json_resource, instance_relationships) {
        let resource_service = Converter.getService(json_resource.type);
        if (resource_service) {
            return Converter.procreate(json_resource);
        }
        else {
            if (isDevMode()) {
                console.warn('`' + json_resource.type + '`', 'service not found on json2resource().', 'Use @Autoregister() on service and inject it on component.');
            }
            let temp = new Resource();
            temp.id = json_resource.id;
            temp.type = json_resource.type;
            return temp;
        }
    }
    static getService(type) {
        let resource_service = Core.me.getResourceService(type);
        return resource_service;
    }
    static getServiceOrFail(type) {
        let resource_service = Core.me.getResourceServiceOrFail(type);
        return resource_service;
    }
    static buildIncluded(document_from) {
        if ('included' in document_from && document_from.included) {
            return Converter.json_array2resources_array_by_type(document_from.included);
        }
        return {};
    }
    /* return a resource type(resoruce_service) with data(data) */
    static procreate(data) {
        if (!('type' in data && 'id' in data)) {
            console.error('Jsonapi Resource is not correct', data);
        }
        let resource = CacheMemory.getInstance().getOrCreateResource(data.type, data.id);
        resource.fill({ data: data });
        resource.is_new = false;
        return resource;
    }
    /*
    Convert json arrays (like included) to an Resources arrays without [keys]
    */
    static json_array2resources_array(json_array, destination_array = {}) {
        for (let data of json_array) {
            let resource = Converter.json2resource(data, false);
            destination_array[resource.type + '_' + resource.id] = resource;
        }
    }
}
//# sourceMappingURL=converter.js.map