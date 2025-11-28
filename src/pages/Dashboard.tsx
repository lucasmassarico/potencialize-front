import { Box, Card, CardContent, Typography } from "@mui/material";

export default function Dashboard() {
    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h5" fontWeight={700}>
                Bem-vindo(a) ao Potencialize
            </Typography>
            <Card>
                <CardContent>
                    <Typography variant="body1">
                        Esta é uma versão inicial. As páginas de Turmas e
                        Avaliações serão implementadas após o contrato das
                        rotas.
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
}
