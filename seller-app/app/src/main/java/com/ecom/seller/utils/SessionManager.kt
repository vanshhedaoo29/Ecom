package com.ecom.seller.utils

import android.content.Context
import android.content.SharedPreferences

class SessionManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(Constants.PREF_NAME, Context.MODE_PRIVATE)

    fun saveToken(token: String) {
        prefs.edit().putString(Constants.KEY_TOKEN, token).apply()
    }

    fun getToken(): String? = prefs.getString(Constants.KEY_TOKEN, null)

    fun saveUserId(id: String) {
        prefs.edit().putString(Constants.KEY_USER_ID, id).apply()
    }

    fun getUserId(): String? = prefs.getString(Constants.KEY_USER_ID, null)

    fun saveUserName(name: String) {
        prefs.edit().putString(Constants.KEY_USER_NAME, name).apply()
    }

    fun getUserName(): String? = prefs.getString(Constants.KEY_USER_NAME, null)

    fun saveUserEmail(email: String) {
        prefs.edit().putString(Constants.KEY_USER_EMAIL, email).apply()
    }

    fun getUserEmail(): String? = prefs.getString(Constants.KEY_USER_EMAIL, null)

    fun saveShopId(shopId: String) {
        prefs.edit().putString(Constants.KEY_SHOP_ID, shopId).apply()
    }

    fun getShopId(): String? = prefs.getString(Constants.KEY_SHOP_ID, null)

    fun isLoggedIn(): Boolean = getToken() != null

    fun clearSession() {
        prefs.edit().clear().apply()
    }
}
