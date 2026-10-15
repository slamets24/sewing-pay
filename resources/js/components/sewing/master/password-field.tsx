import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

type PasswordFieldProps = {
    id: string;
    value: string;
    onChange: (value: string) => void;
    invalid?: boolean;
};

/** Password input with a "Lihat" button so the owner can check what was typed before saving. */
export function PasswordField({ id, value, onChange, invalid }: PasswordFieldProps) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="flex gap-2">
            <Input
                id={id}
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-invalid={invalid || undefined}
                className="flex-1"
            />
            <Button type="button" variant="outline" aria-pressed={visible} onClick={() => setVisible(!visible)}>
                {visible ? <EyeOff /> : <Eye />}
                {visible ? 'Tutup' : 'Lihat'}
            </Button>
        </div>
    );
}
