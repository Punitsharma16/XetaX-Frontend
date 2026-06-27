import { Routes } from "@angular/router";

export const routes: Routes = [
    {
      path: '',
       children: [
        {
          path: '',
          loadComponent: () => import(`./login/login`).then(mod => mod.Login)
        },
        
      ]
    },
  ];