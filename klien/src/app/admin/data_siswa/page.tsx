import { Metadata } from 'next';
import DataSiswaClient from './components/data_siswa_client';

export const metadata: Metadata = {
    title: 'Data Siswa',
};

export default function Siswa() {
    return <DataSiswaClient/>;
}