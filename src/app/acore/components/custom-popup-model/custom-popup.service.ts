import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class CustomModalPopUpService {

    showHideMe(val: boolean, id: string) {
        const modal = document.getElementById(id);
        if (!modal) return;

        if (val) {
            modal.style.display = 'block';
            modal.classList.add('show');
            modal.removeAttribute('aria-hidden');
        } else {
            modal.style.display = 'none';
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    showHideAlert(val: boolean, id: string) {
        this.showHideMe(val, id); // reuse same logic
    }
}