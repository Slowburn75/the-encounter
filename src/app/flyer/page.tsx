import type { Metadata } from 'next';
import FlyerEditor from '@/components/flyer/flyer-editor';
import './style.css';

export const metadata: Metadata = { title: 'Create your Worship and Warfare flyer' };
export default function Page() { return <FlyerEditor />; }
