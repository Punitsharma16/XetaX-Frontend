import { AccountDetails } from "../../pages/desktop/services/account-service/pages/account/account";
import { UserObject } from "../../pages/desktop/services/account-service/pages/users/userModel";

export class SessionObject {
    // userDetails: UserDataObject;
    // userDetails: UserDetails;

    public static setUserDetails(userDetails: any) {
        localStorage.setItem("UserDetails", JSON.stringify(userDetails));
    }

    public static setAccountDetails(accountDetails: any) {
        localStorage.setItem("accountDetails", JSON.stringify(accountDetails));
    }

    public static getUserDetails(): UserObject {
        try {
            const user = JSON.parse(localStorage.getItem("UserDetails") || "{}");
            return user;
        } catch (error) {
            console.error("Error parsing UserDetails:", error);
            return {} as UserObject; // Return an empty object
        }
    }

    public static getAccountDetails(): AccountDetails {
        try {
            const user = JSON.parse(localStorage.getItem("accountDetails") || "{}");
            return user;
        } catch (error) {
            console.error("Error parsing UserDetails:", error);
            return {} as AccountDetails; // Return an empty object
        }
    }
}