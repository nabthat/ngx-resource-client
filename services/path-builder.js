import { implementsIParamsResource } from '../interfaces/type-checks';
import { Core } from '../core';
export class PathBuilder {
    constructor() {
        this.paths = [];
        this.includes = [];
        this.get_params = [];
    }
    applyParams(service, params = {}) {
        this.appendPath(service.getPrePath());
        if (params.beforepath) {
            this.appendPath(params.beforepath);
        }
        this.appendPath(service.getPath());
        if (params.include) {
            this.setInclude(params.include);
        }
        if (implementsIParamsResource(params) && params.include_get) {
            this.setInclude([...this.includes, ...params.include_get]);
        }
        if (params.fields && Object.keys(params.fields).length > 0) {
            for (let resource_type in params.fields) {
                let fields_param = `fields[${resource_type}]=${params.fields[resource_type].join(',')}`;
                this.get_params.push(fields_param);
            }
        }
    }
    appendPath(value) {
        if (value !== '') {
            this.paths.push(value);
        }
    }
    getForCache() {
        return this.paths.join('/') + this.get_params.join('/');
    }
    get() {
        let params = [...this.get_params];
        if (this.includes.length > 0) {
            params.push('include=' + this.includes.join(','));
        }
        return this.paths.join('/') + (params.length > 0 ? Core.injectedServices.rsJsonapiConfig.params_separator + params.join('&') : '');
    }
    setInclude(strings_array) {
        this.includes = strings_array;
    }
}
//# sourceMappingURL=path-builder.js.map