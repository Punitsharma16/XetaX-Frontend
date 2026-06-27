export class UrlConstants {

    static ServerUrl = "http://localhost:8080/";

    static RegisterUrl = UrlConstants.ServerUrl + "auth/v1/register";
    static LoginUrl = UrlConstants.ServerUrl + "auth/v1/login";


    static GET_ALL_USERS = UrlConstants.ServerUrl + "api/v1/users/getAllUsers";
    static UPDATE_USER = UrlConstants.ServerUrl + "api/v1/users/";
    static CREATE_USER = UrlConstants.ServerUrl + "api/v1/users/";


    static BOT_CREATE = UrlConstants.ServerUrl + "api/v1/bot/create";
    static BOT_UPDATE = UrlConstants.ServerUrl + "api/v1/bot/update/";
    static GET_ALL_BOTS = UrlConstants.ServerUrl + "api/v1/bot/getAllBots";

    static getBotKnowledgeBaseUrl(botId: string | number): string {
        return UrlConstants.ServerUrl + `api/v1/bot/knowledge/${botId}`;
    }


    static CHAT_API = UrlConstants.ServerUrl + "api/v1/chat/"

    static getChatScriptApi(userId: string, botId: string | number): string {
        return UrlConstants.ServerUrl + `api/v1/chat/script/${userId}/${botId}`;
    }

    static GET_CONVERSATION_HISTORY = UrlConstants.ServerUrl + "api/v1/chat/"
    static GET_MESSAGE_BY_CONVERSATION_ID = UrlConstants.ServerUrl + "api/v1/chat/message/"


    // Dining Service - Menu
    static GET_MENU_CATEGORIES = UrlConstants.ServerUrl + "api/menu-categories/get";
    static GET_MENU_ITEMS = UrlConstants.ServerUrl + "api/menu-items/getmenus";
    static GET_MENU_ITEMS_BY_CATEGORY = UrlConstants.ServerUrl + "api/menu-items/category/";
    static GET_AVAILABLE_MENU_ITEMS = UrlConstants.ServerUrl + "api/menu-items/available";
    static CREATE_MENU_ITEM = UrlConstants.ServerUrl + "api/menu-items/create";
    static UPDATE_MENU_ITEM = UrlConstants.ServerUrl + "api/menu-items/";
    static DELETE_MENU_ITEM = UrlConstants.ServerUrl + "api/menu-items/";
    static CREATE_MENU_CATEGORY = UrlConstants.ServerUrl + "api/menu-categories/create";
    static UPDATE_MENU_CATEGORY = UrlConstants.ServerUrl + "api/menu-categories/";
    static DELETE_MENU_CATEGORY = UrlConstants.ServerUrl + "api/menu-categories/";

    // AI Voice Bot
    static VOICE_PROCESS = UrlConstants.ServerUrl + "voice";

    // Dining Service - Resources
    static GET_RESOURCES = UrlConstants.ServerUrl + "api/resources";
    static GET_RESOURCE_BY_DISPLAY_ID = UrlConstants.ServerUrl + "api/resources/display/";
    static CREATE_RESOURCE = UrlConstants.ServerUrl + "api/resources";

}