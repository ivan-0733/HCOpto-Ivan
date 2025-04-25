import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
name: 'titlecase',
standalone: true
})
export class TitleCaseSectionPipe implements PipeTransform {
transform(value: string): string {
if (!value) return '';

// Manejar secciones con guiones
if (value.includes('-')) {
    // Dividir por guiones y capitalizar cada palabra
    const parts = value.split('-');
    const formattedParts = parts.map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
    );
    return formattedParts.join(' ');
}

// Para palabras simples
return value.charAt(0).toUpperCase() + value.slice(1);
}
}