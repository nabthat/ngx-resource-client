import { ModuleWithProviders } from '@angular/core';
import { JsonapiConfig } from './jsonapi-config';
import * as i0 from "@angular/core";
import * as i1 from "@angular/common";
import * as i2 from "@angular/common/http";
export declare class NgxJsonapiModule {
    static forRoot(config: JsonapiConfig): ModuleWithProviders<NgxJsonapiModule>;
    static ɵmod: i0.ɵɵNgModuleDefWithMeta<NgxJsonapiModule, never, [typeof i1.CommonModule], [typeof i2.HttpClientModule]>;
    static ɵinj: i0.ɵɵInjectorDef<NgxJsonapiModule>;
}
