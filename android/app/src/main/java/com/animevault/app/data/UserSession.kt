package com.animevault.app

import android.content.Context
import android.content.SharedPreferences

object UserSession {
    private const val PREFS_NAME = "animevault_session"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_USER_EMAIL = "user_email"
    private const val KEY_USER_USERNAME = "user_username"
    private const val KEY_USER_AVATAR = "user_avatar"
    private const val KEY_USER_BANNER = "user_banner"
    private const val KEY_USER_IS_ADMIN = "user_is_admin"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun getUser(): User? {
        if (!::prefs.isInitialized) return null
        val email = prefs.getString(KEY_USER_EMAIL, null) ?: return null
        val id = prefs.getLong(KEY_USER_ID, -1L)
        if (id < 0) return null
        return User(
            id = id,
            email = email,
            username = prefs.getString(KEY_USER_USERNAME, email.substringBefore("@")) ?: email.substringBefore("@"),
            avatar = prefs.getString(KEY_USER_AVATAR, null),
            banner = prefs.getString(KEY_USER_BANNER, null),
            isAdmin = prefs.getBoolean(KEY_USER_IS_ADMIN, false)
        )
    }

    fun saveUser(user: User) {
        if (!::prefs.isInitialized) return
        prefs.edit()
            .putLong(KEY_USER_ID, user.id)
            .putString(KEY_USER_EMAIL, user.email)
            .putString(KEY_USER_USERNAME, user.username)
            .putString(KEY_USER_AVATAR, user.avatar)
            .putString(KEY_USER_BANNER, user.banner)
            .putBoolean(KEY_USER_IS_ADMIN, user.isAdmin)
            .apply()
    }

    fun clearUser() {
        if (!::prefs.isInitialized) return
        prefs.edit().clear().apply()
    }
}
