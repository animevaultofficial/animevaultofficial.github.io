package com.animevault.app

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController

class AuthFragment : Fragment() {
    private var mode = AuthMode.LOGIN

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_auth, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val title = view.findViewById<TextView>(R.id.authTitle)
        val subtitle = view.findViewById<TextView>(R.id.authSubtitle)
        val emailInput = view.findViewById<EditText>(R.id.authEmail)
        val passwordInput = view.findViewById<EditText>(R.id.authPassword)
        val actionButton = view.findViewById<Button>(R.id.authActionButton)
        val switchButton = view.findViewById<Button>(R.id.authSwitchButton)
        val messageView = view.findViewById<TextView>(R.id.authMessage)
        val googleButton = view.findViewById<Button>(R.id.authGoogleButton)

        updateUi(title, subtitle, actionButton, switchButton)

        actionButton.setOnClickListener {
            messageView.text = ""
            val email = emailInput.text.toString().trim()
            val password = passwordInput.text.toString().trim()
            if (email.isEmpty() || password.isEmpty()) {
                messageView.text = "Please enter both email and password."
                return@setOnClickListener
            }

            val result = when (mode) {
                AuthMode.LOGIN -> AuthRepository.login(email, password)
                AuthMode.SIGNUP -> AuthRepository.signup(email, password)
            }

            if (result.success && result.user != null) {
                UserSession.saveUser(result.user)
                messageView.text = "Success! Signed in as ${result.user.username}."
                findNavController().navigate(R.id.homeFragment)
            } else {
                messageView.text = result.message ?: "Authentication failed."
            }
        }

        switchButton.setOnClickListener {
            mode = if (mode == AuthMode.LOGIN) AuthMode.SIGNUP else AuthMode.LOGIN
            messageView.text = ""
            updateUi(title, subtitle, actionButton, switchButton)
        }

        googleButton.setOnClickListener {
            messageView.text = "Google sign-in is not implemented yet. Use email/password for now."
        }
    }

    private fun updateUi(
        title: TextView,
        subtitle: TextView,
        actionButton: Button,
        switchButton: Button
    ) {
        if (mode == AuthMode.LOGIN) {
            title.text = "Sign In"
            subtitle.text = "Enter your email and password to continue." 
            actionButton.text = "Sign In"
            switchButton.text = "Create an account"
        } else {
            title.text = "Sign Up"
            subtitle.text = "Create a new AnimeVault account." 
            actionButton.text = "Sign Up"
            switchButton.text = "Already have an account?"
        }
    }
}

enum class AuthMode {
    LOGIN,
    SIGNUP
}
