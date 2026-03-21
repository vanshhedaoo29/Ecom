package com.ecom.seller.utils

object Constants {
    const val BASE_URL = "http://10.227.108.7:5000/api/"
    const val SOCKET_URL = "http://10.227.108.7:5000"
    const val AGORA_APP_ID = "aac165124d7f408bac4058927ee809a4"

    // SharedPreferences keys
    const val PREF_NAME = "ecom_seller_prefs"
    const val KEY_TOKEN = "jwt_token"
    const val KEY_USER_ID = "user_id"
    const val KEY_USER_NAME = "user_name"
    const val KEY_USER_EMAIL = "user_email"
    const val KEY_SHOP_ID = "shop_id"

    // Intent extras
    const val EXTRA_CALL_ID = "call_id"
    const val EXTRA_BUYER_ID = "buyer_id"
    const val EXTRA_BUYER_NAME = "buyer_name"
    const val EXTRA_CHANNEL_NAME = "channel_name"
    const val EXTRA_AGORA_TOKEN = "agora_token"
}
