import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import './Auth.css';

export const RegisterPage: React.FC = () => {
    const { register, isLoading, error, clearError } = useAuthStore();

    const [formData, setFormData] = useState({
        email: '',
        username: '',
        displayName: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setFormError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setFormError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setFormError('Password must be at least 6 characters');
            return;
        }

        try {
            const success = await register(
                formData.email,
                formData.username,
                formData.password,
                formData.displayName || undefined
            );
            if (success) {
                window.location.href = '/';
            }
        } catch (err) {
            // Error handled by store
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <div className="auth-logo">
                        <span className="auth-logo-emoji">🌳</span>
                        <h1>TreeKin</h1>
                    </div>
                    <p className="auth-subtitle">Join our community & start making an impact!</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {(error || formError) && (
                        <div className="auth-error" onClick={clearError}>
                            {error || formError}
                        </div>
                    )}

                    <Input
                        type="email"
                        name="email"
                        label="Email"
                        placeholder="your@email.com"
                        icon={<Mail size={18} />}
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        type="text"
                        name="username"
                        label="Username"
                        placeholder="Choose a username"
                        icon={<User size={18} />}
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        type="text"
                        name="displayName"
                        label="Display Name (optional)"
                        placeholder="Your display name"
                        icon={<User size={18} />}
                        value={formData.displayName}
                        onChange={handleChange}
                    />

                    <div className="password-field">
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            label="Password"
                            placeholder="Create a password"
                            icon={<Lock size={18} />}
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <Input
                        type={showPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        label="Confirm Password"
                        placeholder="Confirm your password"
                        icon={<Lock size={18} />}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />

                    <Button type="submit" isLoading={isLoading} className="auth-submit">
                        Create Account
                    </Button>
                </form>

                <p className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login" className="auth-link">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
};
