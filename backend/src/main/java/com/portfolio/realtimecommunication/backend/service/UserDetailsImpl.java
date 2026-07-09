package com.portfolio.realtimecommunication.backend.service;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.portfolio.realtimecommunication.backend.model.User;
import jakarta.annotation.Nonnull;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class UserDetailsImpl implements UserDetails {
    private Long id;
    private String username;
    private String email;
    @JsonIgnore
    private String password;
    private Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(Long id, String username, String email, String password) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    public static UserDetailsImpl build(User user) {
        return new UserDetailsImpl(user.getId(), user.getUsername(), user.getEmail(), user.getPassword());
    }

    // Standard Getters/Overrides... (username, password, etc.)
    @Nonnull public Long getId() { return id; }
    @Override @Nonnull public String getUsername() { return username; }
    @Override public String getPassword() { return password; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }

    @Override
    @Nonnull
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities; // This variable should be defined in your class fields
    }
}