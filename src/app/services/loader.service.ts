import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { environment } from "src/environments/environment";
import { AppStorageService } from "./app-storage.service";

@Injectable({
    providedIn: 'root'
})
export class LoaderService {
    public loader$: BehaviorSubject<any> = new BehaviorSubject(null);
    isPremiumPlan: boolean = false;

    constructor(private appStorageService: AppStorageService){
    this.appStorageService.get<boolean>('isPremiumPlan', false).then((isPremiumPlan) => this.isPremiumPlan = isPremiumPlan).catch(() => {});
    }

    public show(adBreak: boolean = false): void {
        this.loader$.next({show: true, adBreak: this.isPremiumPlan ? false: adBreak});
    }

    public hide(): void {
        this.loader$.next({show: false});
    }

    public getLoaderState(): Observable<any> {
        return this.loader$;
    }
}
