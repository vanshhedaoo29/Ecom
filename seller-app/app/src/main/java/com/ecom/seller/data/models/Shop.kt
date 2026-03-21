package com.ecom.seller.data.models

data class Shop(
    val id: String = "",
    val _id: String = "",
    val name: String = "",
    val description: String = "",
    val category: String = "",
    val sellerId: String = "",
    val isLive: Boolean = false,
    val rating: Double = 0.0,
    val totalSales: Int = 0
) {
    fun getShopId() = if (id.isNotEmpty()) id else _id
}