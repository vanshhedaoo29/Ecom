package com.ecom.seller.data.api

import com.ecom.seller.data.models.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Auth
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<User>>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<User>>

    @GET("auth/me")
    suspend fun getMe(@Header("Authorization") token: String): Response<ApiResponse<User>>

    @POST("auth/fcm-token")
    suspend fun updateFcmToken(
        @Header("Authorization") token: String,
        @Body request: FcmTokenRequest
    ): Response<ApiResponse<Any>>

    // Shop
    @GET("shops/my")
    suspend fun getMyShop(@Header("Authorization") token: String): Response<ApiResponse<Shop>>

    @PUT("shops/my")
    suspend fun updateMyShop(
        @Header("Authorization") token: String,
        @Body request: UpdateShopRequest
    ): Response<ApiResponse<Shop>>

    // Products
    @GET("products")
    suspend fun getProducts(
        @Header("Authorization") token: String,
        @Query("shopId") shopId: String
    ): Response<ApiResponse<List<Product>>>

    @POST("products")
    suspend fun addProduct(
        @Header("Authorization") token: String,
        @Body product: Product
    ): Response<ApiResponse<Product>>

    @POST("products")
    suspend fun addProductJson(
        @Header("Authorization") token: String,
        @Body product: Map<String, @JvmSuppressWildcards Any>
    ): Response<ApiResponse<Product>>

    @Multipart
    @POST("products")
    suspend fun addProductWithImage(
        @Header("Authorization") token: String,
        @Part("name") name: RequestBody,
        @Part("description") description: RequestBody,
        @Part("price") price: RequestBody,
        @Part("stock") stock: RequestBody,
        @Part("category") category: RequestBody,
        @Part image: MultipartBody.Part?
    ): Response<ApiResponse<Product>>

    @PUT("products/{id}")
    suspend fun updateProduct(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body product: Product
    ): Response<ApiResponse<Product>>

    @DELETE("products/{id}")
    suspend fun deleteProduct(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): Response<ApiResponse<Any>>

    // Live
    @POST("live/start")
    suspend fun startLive(
        @Header("Authorization") token: String,
        @Body request: StartLiveRequest
    ): Response<ApiResponse<LiveSession>>

    @POST("live/end")
    suspend fun endLive(
        @Header("Authorization") token: String,
        @Body request: EndLiveRequest
    ): Response<ApiResponse<Any>>

    @GET("live/viewers/{sessionId}")
    suspend fun getViewerCount(
        @Header("Authorization") token: String,
        @Path("sessionId") sessionId: String
    ): Response<ApiResponse<Any>>

    // Agora
    @POST("agora/token")
    suspend fun getAgoraToken(
        @Header("Authorization") token: String,
        @Body request: AgoraTokenRequest
    ): Response<AgoraTokenResponse>

    @POST("agora/live-channel")
    suspend fun startLiveWithToken(
        @Header("Authorization") token: String,
        @Body request: Map<String, @JvmSuppressWildcards Any>
    ): Response<ApiResponse<LiveSession>>

    @POST("agora/call-channel")
    suspend fun getCallChannel(
        @Header("Authorization") token: String,
        @Body request: Map<String, @JvmSuppressWildcards Any>
    ): Response<AgoraTokenResponse>

    // Calls
    @PATCH("calls/{id}/accept")
    suspend fun acceptCall(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): Response<ApiResponse<CallSession>>

    @PATCH("calls/{id}/reject")
    suspend fun rejectCall(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): Response<ApiResponse<Any>>

    @PATCH("calls/{id}/end")
    suspend fun endCall(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): Response<ApiResponse<Any>>

    // AR Capture
    @Multipart
    @POST("upload/ar-capture")
    suspend fun uploadARCapture(
        @Header("Authorization") token: String,
        @Part image: MultipartBody.Part
    ): Response<ARCaptureResponse>

    // Orders
    @GET("orders/seller")
    suspend fun getSellerOrders(@Header("Authorization") token: String): Response<ApiResponse<List<Order>>>

    @PUT("orders/{id}/status")
    suspend fun updateOrderStatus(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body request: UpdateOrderStatusRequest
    ): Response<ApiResponse<Order>>
}
