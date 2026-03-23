package com.ecom.seller.data.models

data class ARCaptureResponse(
    val success: Boolean = false,
    val imageUrl: String = "",
    val message: String = ""
)
