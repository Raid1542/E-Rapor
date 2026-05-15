import { Metadata } from 'next';
import DataPembinaEkskulClient from './components/data_pembina_ekskul_client';

export const metadata: Metadata = {
    title: 'Data Pembina Ekstrakurikuler',
};

export default function DataPembinaEkskul() {
    return <DataPembinaEkskulClient />;
}