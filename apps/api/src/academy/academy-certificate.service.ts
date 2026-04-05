import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

@Injectable()
export class AcademyCertificateService {
  async build(params: {
    fullName: string;
    courseTitle: string;
    completedAt: Date;
    municipality: string;
  }): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const title = 'Certificado de conclusão';
    page.drawText(title, {
      x: 120,
      y: 720,
      size: 22,
      font: bold,
      color: rgb(0.12, 0.22, 0.28),
    });

    const body = `Certificamos que ${params.fullName} concluiu com aproveitamento a formação intitulada`;
    page.drawText(body, {
      x: 72,
      y: 660,
      size: 11,
      font: regular,
      color: rgb(0.2, 0.22, 0.25),
      maxWidth: 450,
    });

    page.drawText(`«${params.courseTitle}»`, {
      x: 72,
      y: 620,
      size: 13,
      font: bold,
      color: rgb(0.1, 0.35, 0.38),
      maxWidth: 450,
    });

    const dateStr = params.completedAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    page.drawText(`${params.municipality}, ${dateStr}.`, {
      x: 72,
      y: 520,
      size: 11,
      font: regular,
      color: rgb(0.25, 0.27, 0.3),
    });

    page.drawText('Conexão Municipal — Academia Empresarial', {
      x: 72,
      y: 120,
      size: 9,
      font: regular,
      color: rgb(0.45, 0.47, 0.5),
    });

    return pdf.save();
  }
}
