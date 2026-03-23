package com.ecom.seller.data.models

//data class Product(
//    val id: String = "",
//    val _id: String = "",
//    val name: String = "",
//    val description: String = "",
//    val price: Double = 0.0,
//    val stock: Int = 0,
//    val category: String = "",
//    val imageUrl: String = "",
//    val shopId: String = ""
//) {
//    fun getProductId() = if (id.isNotEmpty()) id else _id
//}


// Product.kt
data class Product(
    val id: Int = 0,
    val shop_id: Int = 0,
    val name: String = "",
    val description: String = "",
    val price: Double = 0.0,
    val stock_qty: Int = 0,
    val category: String = "",
    val image_urls: List<String> = emptyList()
) {
    fun getProductId() = id.toString()
}