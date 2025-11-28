// src/pages/Login.tsx
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Button, Card, CardContent, Checkbox, FormControlLabel, IconButton, InputAdornment, Link, TextField, Typography, Alert } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useAuth } from "../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { normalizeAxiosError } from "../lib/error";
import background from "../assets/background_o.png";

const schema = z.object({
    email: z.string().email("E-mail inválido"),
    password: z.string().min(1, "Informe a senha"),
    remember: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
    const { login } = useAuth();
    const nav = useNavigate();
    const loc = useLocation() as any;

    const [error, setError] = React.useState<string | null>(null);
    const [showPassword, setShowPassword] = React.useState(false);
    const [capsLock, setCapsLock] = React.useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setFocus,
        reset,
        watch,
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: "", password: "", remember: false },
    });

    const remember = watch("remember");

    React.useEffect(() => {
        const saved = localStorage.getItem("potencialize_email");

        console.log(saved);

        if (saved) {
            reset({ email: saved, password: "", remember: true });

            // Garante que o foco rode depois do reset/render
            setTimeout(() => {
                setFocus("password");
            }, 0);
            // ou: requestAnimationFrame(() => setFocus("password"));
        } else {
            setFocus("email");
        }
    }, [reset, setFocus]);

    const handleKeyUp = (ev: React.KeyboardEvent<HTMLInputElement>) => {
        const isCaps = ev.getModifierState && ev.getModifierState("CapsLock");
        setCapsLock(Boolean(isCaps));
    };

    const onSubmit = handleSubmit(async (values) => {
        setError(null);
        try {
            await login({ email: values.email, password: values.password });
            if (values.remember) localStorage.setItem("potencialize_email", values.email);
            else localStorage.removeItem("potencialize_email");
            const to = loc.state?.from?.pathname || "/";
            nav(to, { replace: true });
        } catch (err) {
            const n = normalizeAxiosError(err);
            // 👇 se vier 401, força mensagem de credenciais
            const msg = (n.status === 401 && "E-mail ou senha incorretos.") || n.message || "Não foi possível entrar. Tente novamente.";
            setError(msg);
        }
    });
    return (
        <Box
            sx={{
                position: "relative",
                display: "grid",
                placeItems: "center",
                minHeight: "100vh",
                p: 2,
                backgroundImage: `url(${background})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <Card
                sx={{
                    width: "100%",
                    maxWidth: 400,
                    background: "rgba(255,255,255,0.92)",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
                    p: 1,
                }}
            >
                <CardContent>
                    <Typography variant="h1" fontWeight={700} textAlign="center" mb={1} color="text.error">
                        Potencialize
                    </Typography>
                    <Typography variant="body2" textAlign="center" color="text.secondary" mb={3}>
                        Insights de avaliações para decisões rápidas
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={onSubmit} noValidate>
                        <TextField
                            label="E-mail"
                            type="email"
                            fullWidth
                            margin="normal"
                            {...register("email")}
                            error={!!errors.email}
                            helperText={errors.email?.message}
                            autoComplete="username"
                        />

                        <TextField
                            label="Senha"
                            type={showPassword ? "text" : "password"}
                            fullWidth
                            margin="normal"
                            {...register("password")}
                            error={!!errors.password}
                            helperText={errors.password?.message || (capsLock ? "⚠ Caps Lock está ativado" : " ")}
                            onKeyUp={handleKeyUp}
                            autoComplete="current-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton aria-label="Mostrar/ocultar senha" onClick={() => setShowPassword((s) => !s)} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                mt: 0,
                            }}
                        >
                            <FormControlLabel control={<Checkbox {...register("remember")} checked={!!remember} />} label="Lembrar-me" />
                            <Link href="/forgot-password" underline="hover">
                                Esqueci minha senha
                            </Link>
                        </Box>

                        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={isSubmitting}>
                            {isSubmitting ? "Entrando…" : "Entrar"}
                        </Button>

                        <Typography variant="caption" display="block" textAlign="center" color="text.secondary" sx={{ mt: 1 }}>
                            Política de Privacidade • <Link href="#">Contrato</Link>
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
