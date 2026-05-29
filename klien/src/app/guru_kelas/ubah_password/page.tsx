import { Metadata } from 'next';
import UbahPasswordClient from './components/ubah_password_client';

export const metadata: Metadata = {
    title: 'Ubah Kata Sandi',
};

export default function UbahPasswordPage() {
    return <UbahPasswordClient />;
}