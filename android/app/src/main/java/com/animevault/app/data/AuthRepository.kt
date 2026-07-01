package com.animevault.app

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject
import java.security.MessageDigest

data class AuthResult(
    val success: Boolean,
    val user: User? = null,
    val message: String? = null
)

object AuthRepository {
    private const val PREFS_NAME = "animevault_users"
    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun normalizedEmail(email: String): String {
        return email.trim().lowercase()
    }

    private fun buildKey(email: String): String {
        return "user_${normalizedEmail(email)}"
    }

    private fun hashPassword(password: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest(password.toByteArray(Charsets.UTF_8))
        return bytes.joinToString(separator = "") { "%02x".format(it) }
    }

    private fun getStoredUser(email: String): JSONObject? {
        if (!::prefs.isInitialized) return null
        val json = prefs.getString(buildKey(email), null) ?: return null
        return try {
            JSONObject(json)
        } catch (e: Exception) {
            null
        }
    }

    private fun saveUserObject(email: String, data: JSONObject) {
        if (!::prefs.isInitialized) return
        prefs.edit().putString(buildKey(email), data.toString()).apply()
    }

    fun signup(email: String, password: String): AuthResult {
        val normalized = normalizedEmail(email)
        if (normalized.isBlank() || password.isBlank()) {
            return AuthResult(false, message = "Email and password are required.")
        }
        if (password.length < 6) {
            return AuthResult(false, message = "Password must be at least 6 characters.")
        }
        if (getStoredUser(normalized) != null) {
            return AuthResult(false, message = "An account already exists for this email.")
        }

        val user = User(
            id = System.currentTimeMillis(),
            email = normalized,
            username = normalized.substringBefore("@"),
            avatar = null,
            banner = null,
            isAdmin = false
        )

        val objectData = JSONObject().apply {
            put("id", user.id)
            put("email", user.email)
            put("username", user.username)
            put("avatar", user.avatar)
            put("banner", user.banner)
            put("isAdmin", user.isAdmin)
            put("password", hashPassword(password))
        }

        saveUserObject(normalized, objectData)
        return AuthResult(true, user = user)
    }

    fun login(email: String, password: String): AuthResult {
        val normalized = normalizedEmail(email)
        if (normalized.isBlank() || password.isBlank()) {
            return AuthResult(false, message = "Email and password are required.")
        }

        val stored = getStoredUser(normalized)
            ?: return AuthResult(false, message = "Account not found. Please sign up first.")

        val storedHash = stored.optString("password", "")
        if (storedHash != hashPassword(password)) {
            return AuthResult(false, message = "Email or password is incorrect.")
        }

        val user = User(
            id = stored.optLong("id", System.currentTimeMillis()),
            email = stored.optString("email", normalized),
            username = stored.optString("username", normalized.substringBefore("@")),
            avatar = if (stored.has("avatar")) stored.optString("avatar", null) else null,
            banner = if (stored.has("banner")) stored.optString("banner", null) else null,
            isAdmin = stored.optBoolean("isAdmin", false)
        )

        return AuthResult(true, user = user)
    }
}
