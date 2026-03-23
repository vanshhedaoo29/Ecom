package com.ecom.seller.ui.products

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.ecom.seller.data.api.RetrofitClient
import com.ecom.seller.data.models.Product
import com.ecom.seller.databinding.FragmentProductsBinding
import com.ecom.seller.utils.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class ProductsFragment : Fragment() {

    private var _binding: FragmentProductsBinding? = null
    private val binding get() = _binding!!
    private lateinit var sessionManager: SessionManager
    private val products = mutableListOf<Product>()
    private lateinit var adapter: ProductAdapter
    private val job = Job()
    private val scope = CoroutineScope(Dispatchers.Main + job)

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentProductsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        sessionManager = SessionManager(requireContext())
        adapter = ProductAdapter(products)
        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.adapter = adapter
        setupSwipeToDelete()
        binding.fabAddProduct.setOnClickListener {
            startActivity(Intent(requireContext(), AddProductActivity::class.java))
        }
        loadProducts()
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) loadProducts()
    }

    private fun loadProducts() {
        val shopId = sessionManager.getShopId() ?: return
        val token = sessionManager.getToken() ?: return
        if (_binding == null) return
        _binding?.progressBar?.visibility = View.VISIBLE

        scope.launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    RetrofitClient.apiService.getProducts("Bearer $token", shopId)
                }
                if (_binding == null) return@launch
                if (response.isSuccessful) {
                    val list = response.body()?.products ?: emptyList()
                    products.clear()
                    products.addAll(list)
                    adapter.notifyDataSetChanged()
                    _binding?.tvEmpty?.visibility = if (products.isEmpty()) View.VISIBLE else View.GONE
                }
            } catch (e: Exception) {
                if (_binding != null && isAdded) {
                    Toast.makeText(requireContext(), "Error loading products", Toast.LENGTH_SHORT).show()
                }
            } finally {
                if (_binding != null) {
                    _binding?.progressBar?.visibility = View.GONE
                }
            }
        }
    }

    private fun setupSwipeToDelete() {
        val swipeCallback = object : ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT) {
            override fun onMove(rv: RecyclerView, vh: RecyclerView.ViewHolder, t: RecyclerView.ViewHolder) = false
            override fun onSwiped(viewHolder: RecyclerView.ViewHolder, direction: Int) {
                val position = viewHolder.adapterPosition
                val product = products[position]
                deleteProduct(product, position)
            }
        }
        ItemTouchHelper(swipeCallback).attachToRecyclerView(binding.recyclerView)
    }

    private fun deleteProduct(product: Product, position: Int) {
        val token = sessionManager.getToken() ?: return
        scope.launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    RetrofitClient.apiService.deleteProduct("Bearer $token", product.getProductId())
                }
                if (_binding == null) return@launch
                if (response.isSuccessful) {
                    products.removeAt(position)
                    adapter.notifyItemRemoved(position)
                    if (isAdded) Toast.makeText(requireContext(), "Product deleted", Toast.LENGTH_SHORT).show()
                } else {
                    adapter.notifyItemChanged(position)
                    if (isAdded) Toast.makeText(requireContext(), "Failed to delete", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                if (isAdded) adapter.notifyItemChanged(position)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        job.cancel()
        _binding = null
    }
}