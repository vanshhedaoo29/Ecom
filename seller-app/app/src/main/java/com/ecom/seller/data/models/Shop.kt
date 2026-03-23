//package com.ecom.seller.data.models
//
//data class Shop(
//    val id: String = "",
//    val _id: String = "",
//    val name: String = "",
//    val description: String = "",
//    val category: String = "",
//    val sellerId: String = "",
//    val isLive: Boolean = false,
//    val rating: Double = 0.0,
//    val totalSales: Int = 0
//) {
//    fun getShopId() = if (id.isNotEmpty()) id else _id
//}

package com.ecom.seller.data.models

import com.google.gson.annotations.SerializedName

data class Shop(
    @SerializedName("id")
    val id: Int = 0,
    val name: String = "",
    val description: String = "",
    val category: String = "",
    val seller_id: Int = 0,
    val is_live: Boolean = false,
    val rating: Double = 0.0
) {
    fun getShopId() = id.toString()
}