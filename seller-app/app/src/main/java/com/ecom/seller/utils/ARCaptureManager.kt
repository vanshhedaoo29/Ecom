package com.ecom.seller.utils

import android.content.Context
import android.graphics.Bitmap
import android.widget.Toast
import com.ecom.seller.data.api.RetrofitClient
import io.agora.rtc2.RtcEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream

object ARCaptureManager {

    fun captureWithAgora(
        rtcEngine: RtcEngine?,
        context: Context,
        token: String,
        callId: String,
        channelName: String,
        onComplete: (Boolean) -> Unit
    ) {
        val filePath = context.cacheDir.absolutePath + "/ar_capture_$callId.jpg"
        val ret = rtcEngine?.takeSnapshot(0, filePath)
        if (ret != 0) {
            uploadFallbackBitmap(context, token, callId, onComplete)
            return
        }

        GlobalScope.launch(Dispatchers.IO) {
            try {
                Thread.sleep(500)
                val file = java.io.File(filePath)
                if (!file.exists() || file.length() == 0L) {
                    withContext(Dispatchers.Main) { uploadFallbackBitmap(context, token, callId, onComplete) }
                    return@launch
                }
                uploadFile(context, token, callId, file, onComplete)
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Capture error: ${e.message}", Toast.LENGTH_SHORT).show()
                    onComplete(false)
                }
            }
        }
    }

    private fun uploadFallbackBitmap(context: Context, token: String, callId: String, onComplete: (Boolean) -> Unit) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                val bitmap = Bitmap.createBitmap(720, 1280, Bitmap.Config.ARGB_8888)
                val outputStream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
                bitmap.recycle()
                val byteArray = outputStream.toByteArray()
                val requestBody = byteArray.toRequestBody("image/jpeg".toMediaTypeOrNull())
                val imagePart = MultipartBody.Part.createFormData("image", "ar_capture_$callId.jpg", requestBody)
                val response = RetrofitClient.apiService.uploadARCapture("Bearer $token", imagePart)
                val imageUrl = response.body()?.imageUrl ?: ""
                withContext(Dispatchers.Main) {
                    if (imageUrl.isNotEmpty()) {
                        SocketManager.emitGarmentCaptured(imageUrl, callId)
                        Toast.makeText(context, "Garment sent to buyer ✅", Toast.LENGTH_SHORT).show()
                        onComplete(true)
                    } else {
                        Toast.makeText(context, "Upload failed", Toast.LENGTH_SHORT).show()
                        onComplete(false)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    onComplete(false)
                }
            }
        }
    }

    private suspend fun uploadFile(context: Context, token: String, callId: String, file: java.io.File, onComplete: (Boolean) -> Unit) {
        try {
            val requestBody = file.readBytes().toRequestBody("image/jpeg".toMediaTypeOrNull())
            val imagePart = MultipartBody.Part.createFormData("image", file.name, requestBody)
            val response = RetrofitClient.apiService.uploadARCapture("Bearer $token", imagePart)
            val imageUrl = response.body()?.imageUrl ?: ""
            withContext(Dispatchers.Main) {
                if (imageUrl.isNotEmpty()) {
                    SocketManager.emitGarmentCaptured(imageUrl, callId)
                    Toast.makeText(context, "Garment sent to buyer ✅", Toast.LENGTH_SHORT).show()
                    onComplete(true)
                } else {
                    Toast.makeText(context, "Upload failed", Toast.LENGTH_SHORT).show()
                    onComplete(false)
                }
            }
        } catch (e: Exception) {
            withContext(Dispatchers.Main) {
                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                onComplete(false)
            }
        }
    }
}