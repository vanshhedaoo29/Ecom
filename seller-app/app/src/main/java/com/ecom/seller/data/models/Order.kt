package com.ecom.seller.data.models

data class Order(
    val id: String = "",
    val _id: String = "",
    val buyerId: String = "",
    val buyerName: String = "",
    val productId: String = "",
    val productName: String = "",
    val quantity: Int = 1,
    val totalPrice: Double = 0.0,
    val status: String = "pending",
    val createdAt: String = ""
) {
    fun getOrderId() = if (id.isNotEmpty()) id else _id
}
