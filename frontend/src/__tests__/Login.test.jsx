import { render, screen } from '@testing-library/react';
import PatientPortal from '../PatientPortal';
import { describe, it, expect } from 'vitest';

// Unit test for the login screen of PatientPortal

describe('Login Screen', () => {
    it('renders login form when not authenticated', () => {
        render(<PatientPortal />);
        expect(screen.getByText('Doctor Login')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
        expect(screen.getByText('Login')).toBeInTheDocument();
    });
});