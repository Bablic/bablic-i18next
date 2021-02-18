import HttpApi from 'i18next-http-backend';
import {RequestCallback} from 'i18next-http-backend';
import {PostProcessorModule, ReadCallback} from "i18next";

interface HttpApiPrivateApi extends HttpApi {
    options: {
        request(options: any, url: string, payload: any, callback: RequestCallback): void;
    };

}

let cacheBreaker = "";
function isInEditor() {
    try {
        return (window as any).bablic.preprocessI18nItem;
    } catch (e) {
        return false;
    }
}

interface ReportItem {
    key: string;
    ns: string;
    content?: string;
}

export class BablicI18next extends (HttpApi as { new(): HttpApiPrivateApi }) {
    private isDebug = false;
    private siteId = "";
    private _timeout: any;
    private isInEditor = false;
    private lang = "";
    private bulk: ReportItem[] = [];
    private withNs = false;

    init(...args: any[]): void {
        super.init(...args);
        this.isInEditor = isInEditor();
        const backendOptions = args[1] || {};
        this.isDebug = !!backendOptions.isDebug;
        this.siteId = backendOptions.siteId as string;
        this.withNs = !!backendOptions.withNs;

    }

    read(language: string, namespace: string, callback: ReadCallback): void {
        if (language === "dev")
            return callback(null, {});
        if (!this.siteId)
            throw new Error("siteId is required");
        if (this.isInEditor) {
            return callback(null, {});
        }
        const url = `https://c.bablic.com${this.isDebug ? "/test" : ""}/sites/${this.siteId}/${this.withNs ? namespace + "." : "ngx."}${language}.json${cacheBreaker ? "?r=" + cacheBreaker : ""}`;

        this.options.request(this.options, url, null,
            (err, res) => {
                if (res && ((res.status >= 500 && res.status < 600) || !res.status)) return callback(new Error('failed loading ' + url + ' status code: ' + res.status), true /* retry */);
                if (res && res.status >= 400 && res.status < 500) return callback(new Error('failed loading ' + url + '; status code: ' + res.status), false /* no retry */);
                if (!res && err && err.message && err.message.indexOf('Failed to fetch') > -1) return callback(new Error('failed loading ' + url + ': ' + err.message), false /* retry */);
                if (err) return callback(err, false);

                let json: any;
                try {
                    json = JSON.parse(res.data);
                } catch (e) {
                    return callback(new Error('failed parsing ' + url + ' to json'), false);
                }
                const empties = json["__"] as string[];
                if (empties) {
                    empties.forEach((emp) => {
                        json[emp] = emp;
                    });
                    delete json["__"];
                }
                callback(null, json);
            });
    }

    addMissing(key: string, ns: string, content: string) {
        const item: ReportItem = {key, ns};
        if (content && content !== key)
            item["content"] = content;
        this.bulk.push(item);
        clearTimeout(this._timeout);
        this._timeout = setTimeout(() => this.flush(), 1000);
    }

    async flush() {
        const tempBulk = this.bulk;
        this.bulk = [];
        const domain = this.isDebug ? "https://staging.bablic.com" : "https://e2.bablic.com";
        const url = `${domain}/api/engine/ngx-report?s=${this.siteId}&l=${this.lang}&uri=${encodeURIComponent(location.host + location.pathname)}`;
        this.options.request(this.options, url, tempBulk, (err, res) => {
            if (err) {
                console.error(err);
                this.bulk = [...tempBulk, ...this.bulk];
                return;
            }
            const reply = JSON.parse(res.data);
            if (reply && (reply as any).updated) {
                cacheBreaker = Date.now() + "";
            }
            // if (this.service) {
            //     this.service.resetLang()
            // }
        });
    }

    create(languages: string | string[], namespace: string, key: string, fallbackValue: string): void {
        if (!this.isInEditor) {
        //     // wrap with tags
        //     //return (window as any).bablic.preprocessI18nItem(key, fallbackValue);
        //     return;
        // } else {
            // report this missing, and return parsed
            this.addMissing(key, namespace, fallbackValue);
        }
    }
}

export class BablicPostProcessor implements PostProcessorModule {
    // static type = "postProcessor";
    // type = "postProcessor";
    name: "BablicPostProcessor" = "BablicPostProcessor";
    type: "postProcessor" = "postProcessor";
    static type: "postProcessor" = "postProcessor";

    process(value: any, key: any, options: any, translator: any) {
        if (isInEditor())
            return (window as any).bablic.preprocessI18nItem(key, value);
        /* return manipulated value */
        return value;
    }

}

BablicPostProcessor.type = "postProcessor";
