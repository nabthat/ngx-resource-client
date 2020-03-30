import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { JsonapiInjector } from '../services/jsonapi-injector';
import { JsonapiConfig } from '../jsonapi-config';
import { share, tap } from 'rxjs/operators';
import * as i0 from "@angular/core";
export class Http {
    constructor() {
        // NOTE: GET requests are stored in a this object to prevent duplicate requests
        this.get_requests = {};
        // this.http = JsonapiInjector.get(HttpClient)
        this.rsJsonapiConfig = JsonapiInjector.get(JsonapiConfig);
    }
    setHttpClient(http) {
        this.http = http;
    }
    exec(path, method, data) {
        let req = {
            body: data || null,
            headers: new HttpHeaders({
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json'
            })
        };
        // NOTE: prevent duplicate GET requests
        if (method === 'get') {
            if (!this.get_requests[path]) {
                let obs = this.http.request(method, this.rsJsonapiConfig.url + path, req).pipe(tap(() => {
                    delete this.get_requests[path];
                }), share());
                this.get_requests[path] = obs;
                return obs;
            }
            return this.get_requests[path];
        }
        return this.http.request(method, this.rsJsonapiConfig.url + path, req).pipe(tap(() => {
            delete this.get_requests[path];
        }), share());
    }
}
Http.ɵfac = function Http_Factory(t) { return new (t || Http)(); };
Http.ɵprov = i0.ɵɵdefineInjectable({ token: Http, factory: Http.ɵfac });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(Http, [{
        type: Injectable
    }], function () { return []; }, null); })();
//# sourceMappingURL=http.service.js.map