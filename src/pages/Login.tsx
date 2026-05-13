// src/pages/Login.tsx
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, Checkbox, FormControlLabel, IconButton, InputAdornment, Link, Stack, TextField, Typography } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import { useAuth } from "../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { normalizeAxiosError } from "../lib/error";
import { LoginBackdrop } from "../components/auth/LoginBackdrop";

const schema = z.object({
    email: z.string().email("E-mail inválido"),
    password: z.string().min(1, "Informe a senha"),
    remember: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

interface ValueProp {
    icon: React.ReactNode;
    label: string;
}

const VALUE_PROPS: ValueProp[] = [
    { icon: <AutoGraphRoundedIcon fontSize="small" />, label: "Diagnóstico instantâneo por questão" },
    { icon: <GroupsRoundedIcon fontSize="small" />, label: "Desempenho granular por aluno" },
    { icon: <BoltRoundedIcon fontSize="small" />, label: "Decisões pedagógicas em minutos" },
];

export default function Login() {
    const { login } = useAuth();
    const nav = useNavigate();
    const loc = useLocation() as { state?: { from?: { pathname?: string } } };

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
        if (saved) {
            reset({ email: saved, password: "", remember: true });
            setTimeout(() => setFocus("password"), 0);
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
            const msg = (n.status === 401 && "E-mail ou senha incorretos.") || n.message || "Não foi possível entrar. Tente novamente.";
            setError(msg);
        }
    });

    return (
        <Box
            sx={{
                position: "relative",
                minHeight: "100vh",
                width: "100%",
                overflow: "hidden",
                color: "#fff",
            }}
        >
            <LoginBackdrop />

            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    minHeight: "100vh",
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "58fr 42fr" },
                    alignItems: "center",
                }}
            >
                {/* LEFT — brand & value props */}
                <Box
                    sx={{
                        display: { xs: "none", md: "flex" },
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: 4,
                        px: { md: 8, lg: 12 },
                        py: 8,
                        animation: "pz-rise 700ms ease-out both",
                        "@keyframes pz-rise": {
                            from: { opacity: 0, transform: "translateY(12px)" },
                            to: { opacity: 1, transform: "translateY(0)" },
                        },
                        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                    }}
                >
                    <Box>
                        <Typography
                            sx={{
                                fontSize: 14,
                                letterSpacing: 4,
                                textTransform: "uppercase",
                                color: "rgba(200,220,255,0.7)",
                                fontWeight: 600,
                                mb: 1.5,
                            }}
                        >
                            Potencialize
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: { md: 44, lg: 56 },
                                lineHeight: 1.05,
                                fontWeight: 700,
                                color: "#fff",
                                maxWidth: 560,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Avaliações que falam
                            <Box component="span" sx={{ display: "block", color: "rgba(180,205,255,0.85)" }}>
                                por dados.
                            </Box>
                        </Typography>
                        <Typography sx={{ mt: 2.5, color: "rgba(220,230,255,0.72)", fontSize: 16, maxWidth: 480, lineHeight: 1.55 }}>
                            Transforme provas, redações e simulados em insight acionável — sem planilha, sem fricção.
                        </Typography>
                    </Box>

                    <Stack spacing={1.5} sx={{ maxWidth: 460 }}>
                        {VALUE_PROPS.map((vp, i) => (
                            <Stack
                                key={vp.label}
                                direction="row"
                                alignItems="center"
                                spacing={1.5}
                                sx={{
                                    color: "rgba(220,230,255,0.85)",
                                    animation: `pz-rise 700ms ease-out both`,
                                    animationDelay: `${180 + i * 110}ms`,
                                    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "grid",
                                        placeItems: "center",
                                        width: 36,
                                        height: 36,
                                        borderRadius: "50%",
                                        background: "rgba(180,205,255,0.10)",
                                        border: "1px solid rgba(180,205,255,0.20)",
                                        color: "#cfe0ff",
                                    }}
                                >
                                    {vp.icon}
                                </Box>
                                <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{vp.label}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>

                {/* RIGHT — form */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: { xs: "center", md: "flex-start" },
                        px: { xs: 2, sm: 4, md: 6, lg: 8 },
                        py: { xs: 4, md: 8 },
                    }}
                >
                    <Box
                        sx={{
                            width: "100%",
                            maxWidth: 420,
                            p: { xs: 3, sm: 4 },
                            borderRadius: 3,
                            background: "rgba(255,255,255,0.06)",
                            backdropFilter: "blur(22px) saturate(140%)",
                            WebkitBackdropFilter: "blur(22px) saturate(140%)",
                            border: "1px solid rgba(255,255,255,0.14)",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
                            color: "#fff",
                            animation: "pz-rise 700ms 120ms ease-out both",
                            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                        }}
                    >
                        <Typography sx={{ fontSize: 13, color: "rgba(200,220,255,0.7)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
                            Acesso
                        </Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 700, mt: 0.5, mb: 0.5, color: "#fff", letterSpacing: "-0.01em" }}>
                            Bem-vindo de volta.
                        </Typography>
                        <Typography sx={{ color: "rgba(220,230,255,0.65)", fontSize: 14, mb: 3 }}>
                            Entre para ver as novidades das suas turmas.
                        </Typography>

                        {error && (
                            <Alert
                                severity="error"
                                sx={{
                                    mb: 2,
                                    background: "rgba(244,67,54,0.12)",
                                    color: "#ffd4d0",
                                    border: "1px solid rgba(244,67,54,0.3)",
                                }}
                            >
                                {error}
                            </Alert>
                        )}

                        <Box component="form" onSubmit={onSubmit} noValidate sx={glassFormSx}>
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
                                            <IconButton
                                                aria-label="Mostrar/ocultar senha"
                                                onClick={() => setShowPassword((s) => !s)}
                                                edge="end"
                                                sx={{ color: "rgba(220,230,255,0.7)" }}
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            {...register("remember")}
                                            checked={!!remember}
                                            sx={{ color: "rgba(200,220,255,0.5)", "&.Mui-checked": { color: "#cfe0ff" } }}
                                        />
                                    }
                                    label={<Typography sx={{ color: "rgba(220,230,255,0.85)", fontSize: 14 }}>Lembrar-me</Typography>}
                                />
                                <Link href="/forgot-password" underline="hover" sx={{ color: "#cfe0ff", fontSize: 14 }}>
                                    Esqueci minha senha
                                </Link>
                            </Box>

                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                sx={{
                                    mt: 2.5,
                                    py: 1.2,
                                    fontSize: 15,
                                    fontWeight: 600,
                                    background: "linear-gradient(135deg, #4f7cff 0%, #6a92ff 100%)",
                                    boxShadow: "0 8px 24px rgba(79,124,255,0.35)",
                                    "&:hover": {
                                        background: "linear-gradient(135deg, #3d6cf0 0%, #5a82f5 100%)",
                                        boxShadow: "0 10px 28px rgba(79,124,255,0.45)",
                                    },
                                }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Entrando…" : "Entrar"}
                            </Button>

                            <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 2, color: "rgba(220,230,255,0.55)" }}>
                                Política de Privacidade ·{" "}
                                <Link href="#" sx={{ color: "rgba(220,230,255,0.75)" }}>
                                    Contrato
                                </Link>
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

const glassFormSx = {
    "& .MuiInputLabel-root": { color: "rgba(220,230,255,0.7)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#cfe0ff" },
    "& .MuiOutlinedInput-root": {
        color: "#fff",
        background: "rgba(255,255,255,0.04)",
        "& fieldset": { borderColor: "rgba(255,255,255,0.18)" },
        "&:hover fieldset": { borderColor: "rgba(255,255,255,0.32)" },
        "&.Mui-focused fieldset": { borderColor: "#8ab0ff", borderWidth: 1 },
    },
    "& .MuiFormHelperText-root": { color: "rgba(220,230,255,0.55)" },
    "& .MuiFormHelperText-root.Mui-error": { color: "#ffb4af" },
} as const;
