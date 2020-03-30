import { PathBuilder } from './path-builder';
import { UrlParamsBuilder } from './url-params-builder';
import { Core } from '../core';
export class PathCollectionBuilder extends PathBuilder {
    applyParams(service, params = {}) {
        super.applyParams(service, params);
        let paramsurl = new UrlParamsBuilder();
        if (params.remotefilter && Object.keys(params.remotefilter).length > 0) {
            if (service.parseToServer) {
                service.parseToServer(params.remotefilter);
            }
            this.addParam(paramsurl.toparams({ filter: params.remotefilter }));
        }
        if (params.page) {
            if (params.page.number > 1) {
                this.addParam(this.getPageConfig().number + '=' + params.page.number);
            }
            if (params.page.size) {
                this.addParam(this.getPageConfig().size + '=' + params.page.size);
            }
        }
        if (params.sort && params.sort.length) {
            this.addParam('sort=' + params.sort.join(','));
        }
    }
    getPageConfig() {
        return ((Core.injectedServices.rsJsonapiConfig.parameters && Core.injectedServices.rsJsonapiConfig.parameters.page) || {
            number: 'number',
            size: 'size'
        });
    }
    addParam(param) {
        this.get_params.push(param);
    }
}
//# sourceMappingURL=path-collection-builder.js.map