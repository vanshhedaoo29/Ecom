//package com.ecom.seller.data.models
//
//data class User(
//    val id: String = "",
//    val _id: String = "",
//    val name: String = "",
//    val email: String = "",
//    val role: String = "",
//    val shopName: String = ""
//) {
//    fun getUserId() = if (id.isNotEmpty()) id else _id
//}



package com.ecom.seller.data.models

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("id")
    val id: Int = 0,
    val name: String = "",
    val email: String = "",
    val role: String = "",
    val shopName: String = ""
) {
    fun getUserId() = id.toString()
}