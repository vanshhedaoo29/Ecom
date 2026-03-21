package com.ecom.seller.ui.products

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.ecom.seller.data.api.RetrofitClient
import com.ecom.seller.databinding.ActivityAddProductBinding
import com.ecom.seller.utils.SessionManager
import kotlinx.coroutines.launch

class AddProductActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAddProductBinding
    private lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAddProductBinding.inflate(layoutInflater)
        setContentView(binding.root)
        sessionManager = SessionManager(this)

        supportActionBar?.title = "Add Product"
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        binding.btnPickImage.visibility = View.GONE
        binding.ivProductImage.visibility = View.GONE

        binding.btnAddProduct.setOnClickListener { addProduct() }
    }

    private fun addProduct() {
        val name = binding.etName.text.toString().trim()
        val description = binding.etDescription.text.toString().trim()
        val priceStr = binding.etPrice.text.toString().trim()
        val stockStr = binding.etStock.text.toString().trim()
        val category = binding.etCategory.text.toString().trim()

        if (name.isEmpty() || priceStr.isEmpty() || stockStr.isEmpty()) {
            Toast.makeText(this, "Name, price and stock are required", Toast.LENGTH_SHORT).show()
            return
        }

        val shopId = sessionManager.getShopId()
        if (shopId.isNullOrEmpty()) {
            Toast.makeText(this, "Shop not found. Please logout and login again.", Toast.LENGTH_LONG).show()
            return
        }

        val price = priceStr.toDoubleOrNull()
        val stock = stockStr.toIntOrNull()
        if (price == null || stock == null) {
            Toast.makeText(this, "Invalid price or stock value", Toast.LENGTH_SHORT).show()
            return
        }

        binding.progressBar.visibility = View.VISIBLE
        binding.btnAddProduct.isEnabled = false

        lifecycleScope.launch {
            try {
                val token = sessionManager.getToken() ?: return@launch

                // Match backend fields exactly: shop_id, stock_qty
                val productMap = mapOf(
                    "shop_id" to shopId,
                    "name" to name,
                    "description" to description,
                    "price" to price,
                    "stock_qty" to stock,
                    "category" to category
                )

                val response = RetrofitClient.apiService.addProductJson(
                    "Bearer $token", productMap
                )

                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(this@AddProductActivity, "Product added! ✅", Toast.LENGTH_SHORT).show()
                    finish()
                } else {
                    val errorMsg = response.body()?.message ?: "Failed (${response.code()})"
                    Toast.makeText(this@AddProductActivity, errorMsg, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@AddProductActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                binding.progressBar.visibility = View.GONE
                binding.btnAddProduct.isEnabled = true
            }
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }
}
