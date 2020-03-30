import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { Core as JsonapiCore } from './core';
import { Http as JsonapiHttp } from './sources/http.service';
import { StoreService as JsonapiStore } from './sources/store.service';
// testing
import { JsonapiConfig } from './jsonapi-config';
import * as i0 from "@angular/core";
export class NgxJsonapiModule {
    static forRoot(config) {
        return {
            ngModule: NgxJsonapiModule,
            providers: [{ provide: JsonapiConfig, useValue: config }]
        };
    }
}
NgxJsonapiModule.ɵmod = i0.ɵɵdefineNgModule({ type: NgxJsonapiModule });
NgxJsonapiModule.ɵinj = i0.ɵɵdefineInjector({ factory: function NgxJsonapiModule_Factory(t) { return new (t || NgxJsonapiModule)(); }, providers: [
        JsonapiCore,
        JsonapiStore,
        JsonapiConfig,
        JsonapiHttp
    ], imports: [[CommonModule],
        // BrowserModule,  // needed by HttpClientModule?
        HttpClientModule] });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(NgxJsonapiModule, { imports: [CommonModule], exports: [
        // BrowserModule,  // needed by HttpClientModule?
        HttpClientModule] }); })();
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(NgxJsonapiModule, [{
        type: NgModule,
        args: [{
                imports: [CommonModule],
                exports: [
                    // BrowserModule,  // needed by HttpClientModule?
                    HttpClientModule
                ],
                providers: [
                    JsonapiCore,
                    JsonapiStore,
                    JsonapiConfig,
                    JsonapiHttp
                ]
            }]
    }], null, null); })();
//# sourceMappingURL=ngx-jsonapi.module.js.map