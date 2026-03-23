package com.ecom.seller.data.models
//
//data class Order(
//    val id: String = "",
//    val _id: String = "",
//    val buyerId: String = "",
//    val buyerName: String = "",
//    val productId: String = "",
//    val productName: String = "",
//    val quantity: Int = 1,
//    val totalPrice: Double = 0.0,
//    val status: String = "pending",
//    val createdAt: String = ""
//) {
//    fun getOrderId() = if (id.isNotEmpty()) id else _id
//}
// Order.kt
data class Order(
    val id: Int = 0,
    val buyer_id: Int = 0,
    val seller_id: Int = 0,
    val shop_id: Int = 0,
    val product_id: Int = 0,
    val quantity: Int = 1,
    val total_price: Double = 0.0,
    val status: String = "pending",
    val created_at: String = ""
) {
    fun getOrderId() = id.toString()
}