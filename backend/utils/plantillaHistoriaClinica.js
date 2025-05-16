obtenerPlantillaHistoriaClinica: catchAsync(async (req, res) => {
  // Crear un objeto con la estructura vacía de todas las secciones
  const plantilla = {
    datosHistoria: {
      // Datos básicos
      profesorID: null,
      consultorioID: null,
      semestreID: null,
      fecha: new Date().toISOString().split('T')[0],
      
      // Datos del paciente (si se crea nuevo)
      nombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      generoID: null,
      edad: null,
      estadoCivilID: null,
      escolaridadID: null,
      ocupacion: '',
      direccionLinea1: '',
      direccionLinea2: '',
      ciudad: '',
      estadoID: null,
      codigoPostal: '',
      pais: 'México',
      correoElectronico: '',
      telefonoCelular: '',
      telefono: '',
      
      // O ID del paciente si ya existe
      pacienteID: null
    },
    secciones: {
      // Interrogatorio
      interrogatorio: {
        motivoConsulta: '',
        heredoFamiliares: '',
        noPatologicos: '',
        patologicos: '',
        visualesOculares: '',
        padecimientoActual: '',
        prediagnostico: ''
      },
      
      // Antecedente Visual - Agudeza Visual (array de mediciones)
      agudezaVisual: [
        {
          tipoMedicion: 'SIN_RX_LEJOS',
          ojoDerechoSnellen: '',
          ojoDerechoMetros: '',
          ojoDerechoDecimal: null,
          ojoDerechoMAR: null,
          ojoIzquierdoSnellen: '',
          ojoIzquierdoMetros: '',
          ojoIzquierdoDecimal: null,
          ojoIzquierdoMAR: null,
          ambosOjosSnellen: '',
          ambosOjosMetros: '',
          ambosOjosDecimal: null,
          ambosOjosMAR: null
        },
        {
          tipoMedicion: 'CON_RX_ANTERIOR_LEJOS',
          ojoDerechoSnellen: '',
          ojoDerechoMetros: '',
          ojoDerechoDecimal: null,
          ojoDerechoMAR: null,
          ojoIzquierdoSnellen: '',
          ojoIzquierdoMetros: '',
          ojoIzquierdoDecimal: null,
          ojoIzquierdoMAR: null,
          ambosOjosSnellen: '',
          ambosOjosMetros: '',
          ambosOjosDecimal: null,
          ambosOjosMAR: null
        },
        {
          tipoMedicion: 'SIN_RX_CERCA',
          ojoDerechoM: '',
          ojoDerechoJeager: '',
          ojoDerechoPuntos: '',
          ojoIzquierdoM: '',
          ojoIzquierdoJeager: '',
          ojoIzquierdoPuntos: '',
          ambosOjosM: '',
          ambosOjosJeager: '',
          ambosOjosPuntos: ''
        },
        {
          tipoMedicion: 'CON_RX_ANTERIOR_CERCA',
          ojoDerechoM: '',
          ojoDerechoJeager: '',
          ojoDerechoPuntos: '',
          ojoIzquierdoM: '',
          ojoIzquierdoJeager: '',
          ojoIzquierdoPuntos: '',
          ambosOjosM: '',
          ambosOjosJeager: '',
          ambosOjosPuntos: ''
        }
      ],
      
      // Antecedente Visual - Lensometría
      lensometria: {
        ojoDerechoEsfera: '',
        ojoDerechoCilindro: '',
        ojoDerechoEje: null,
        ojoIzquierdoEsfera: '',
        ojoIzquierdoCilindro: '',
        ojoIzquierdoEje: null,
        tipoBifocalMultifocalID: null,
        add: '',
        distanciaRango: '',
        centroOptico: null
      },
      
      // Examen Preliminar - Alineación Ocular
      alineacionOcular: {
        lejosHorizontal: '',
        lejoVertical: '',
        cercaHorizontal: '',
        cercaVertical: '',
        metodoID: null
      },
      
      // Examen Preliminar - Motilidad
      motilidad: {
        versiones: '',
        ducciones: '',
        sacadicos: '',
        persecucion: '',
        fijacion: ''
      },
      
      // Examen Preliminar - Exploración Física
      exploracionFisica: {
        ojoDerechoAnexos: '',
        ojoIzquierdoAnexos: '',
        ojoDerechoSegmentoAnterior: '',
        ojoIzquierdoSegmentoAnterior: ''
      },
      
      // Examen Preliminar - Vía Pupilar
      viaPupilar: {
        ojoDerechoDiametro: null,
        ojoIzquierdoDiametro: null,
        ojoDerechoFotomotorPresente: false,
        ojoDerechoConsensualPresente: false,
        ojoDerechoAcomodativoPresente: false,
        ojoIzquierdoFotomotorPresente: false,
        ojoIzquierdoConsensualPresente: false,
        ojoIzquierdoAcomodativoPresente: false,
        ojoDerechoFotomotorAusente: false,
        ojoDerechoConsensualAusente: false,
        ojoDerechoAcomodativoAusente: false,
        ojoIzquierdoFotomotorAusente: false,
        ojoIzquierdoConsensualAusente: false,
        ojoIzquierdoAcomodativoAusente: false,
        esIsocoria: false,
        esAnisocoria: false,
        respuestaAcomodacion: false,
        pupilasIguales: false,
        pupilasRedondas: false,
        respuestaLuz: false,
        dip: '',
        dominanciaOcularID: null
      },
      
      // Estado Refractivo
      estadoRefractivo: {
        ojoDerechoQueratometria: '',
        ojoIzquierdoQueratometria: '',
        ojoDerechoAstigmatismoCorneal: null,
        ojoIzquierdoAstigmatismoCorneal: null,
        ojoDerechoAstigmatismoJaval: '',
        ojoIzquierdoAstigmatismoJaval: '',
        ojoDerechoRetinoscopiaEsfera: null,
        ojoDerechoRetinosciopiaCilindro: null,
        ojoDerechoRetinoscopiaEje: null,
        ojoIzquierdoRetinoscopiaEsfera: null,
        ojoIzquierdoRetinosciopiaCilindro: null,
        ojoIzquierdoRetinoscopiaEje: null,
        ojoDerechoSubjetivoEsfera: null,
        ojoDerechoSubjetivoCilindro: null,
        ojoDerechoSubjetivoEje: null,
        ojoIzquierdoSubjetivoEsfera: null,
        ojoIzquierdoSubjetivoCilindro: null,
        ojoIzquierdoSubjetivoEje: null,
        ojoDerechoBalanceBinocularesEsfera: null,
        ojoDerechoBalanceBinocularesCilindro: null,
        ojoDerechoBalanceBinocularesEje: null,
        ojoIzquierdoBalanceBinocularesEsfera: null,
        ojoIzquierdoBalanceBinocularesCilindro: null,
        ojoIzquierdoBalanceBinocularesEje: null,
        ojoDerechoAVLejana: '',
        ojoIzquierdoAVLejana: ''
      },
      
      // Subjetivo Cerca
      subjetivoCerca: {
        ojoDerechoM: '',
        ojoDerechoJacger: '',
        ojoDerechoPuntos: '',
        ojoDerechoSnellen: '',
        ojoIzquierdoM: '',
        ojoIzquierdoJacger: '',
        ojoIzquierdoPuntos: '',
        ojoIzquierdoSnellen: '',
        ambosOjosM: '',
        ambosOjosJacger: '',
        ambosOjosPuntos: '',
        ambosOjosSnellen: '',
        valorADD: '',
        av: '',
        distancia: '',
        rango: ''
      },
      
      // Binocularidad
      binocularidad: {
        ppc: '',
        arn: '',
        arp: '',
        donders: false,
        sheards: false,
        habAcomLente: '',
        habAcomDificultad: '',
        ojoDerechoAmpAcomCm: '',
        ojoDerechoAmpAcomD: null,
        ojoIzquierdoAmpAcomCm: '',
        ojoIzquierdoAmpAcomD: null,
        ambosOjosAmpAcomCm: '',
        ambosOjosAmpAcomD: null
      },
      
      // Forias
      forias: {
        horizontalesLejos: '',
        horizontalesCerca: '',
        verticalLejos: '',
        verticalCerca: '',
        metodoMedicionID: null,
        caa: '',
        caaCalculada: '',
        caaMedida: ''
      },
      
      // Vergencias
      vergencias: {
        positivasLejosBorroso: null,
        positivasLejosRuptura: null,
        positivasLejosRecuperacion: null,
        positivasCercaBorroso: null,
        positivasCercaRuptura: null,
        positivasCercaRecuperacion: null,
        negativasLejosBorroso: null,
        negativasLejosRuptura: null,
        negativasLejosRecuperacion: null,
        negativasCercaBorroso: null,
        negativasCercaRuptura: null,
        negativasCercaRecuperacion: null,
        supravergenciasLejosRuptura: null,
        supravergenciasLejosRecuperacion: null,
        supravergenciasCercaRuptura: null,
        supravergenciasCercaRecuperacion: null,
        infravergenciasLejosRuptura: null,
        infravergenciasLejosRecuperacion: null,
        infravergenciasCercaRuptura: null,
        infravergenciasCercaRecuperacion: null
      },
      
      // Método Gráfico
      metodoGrafico: {
        integracionBinocular: '',
        tipoID: null,
        visionEstereoscopica: '',
        tipoVisionID: null,
        imagenID: null
      },
      
      // Detección de Alteraciones - Grid de Amsler
      gridAmsler: {
        numeroCartilla: '',
        ojoDerechoSensibilidadContraste: '',
        ojoIzquierdoSensibilidadContraste: '',
        ojoDerechoVisionCromatica: '',
        ojoIzquierdoVisionCromatica: '',
        ojoDerechoImagenID: null,
        ojoIzquierdoImagenID: null
      },
      
      // Detección de Alteraciones - Tonometría
      tonometria: {
        metodoAnestesico: '',
        fecha: null,
        hora: null,
        ojoDerecho: null,
        ojoIzquierdo: null,
        tipoID: null
      },
      
      // Detección de Alteraciones - Paquimetría
      paquimetria: {
        ojoDerechoCCT: null,
        ojoIzquierdoCCT: null,
        ojoDerechoPIOCorregida: null,
        ojoIzquierdoPIOCorregida: null,
         ojoIzquierdoPIOCorregida: null
      },
      
      // Detección de Alteraciones - Campimetría
      campimetria: {
        distancia: null,
        tamanoColorIndice: '',
        tamanoColorPuntoFijacion: '',
        ojoDerechoImagenID: null,
        ojoIzquierdoImagenID: null
      },
      
      // Detección de Alteraciones - Biomicroscopía
      biomicroscopia: {
        ojoDerechoPestanas: '',
        ojoIzquierdoPestanas: '',
        ojoDerechoParpadosIndice: '',
        ojoIzquierdoParpadosIndice: '',
        ojoDerechoBordePalpebral: '',
        ojoIzquierdoBordePalpebral: '',
        ojoDerechoLineaGris: '',
        ojoIzquierdoLineaGris: '',
        ojoDerechoCantoExterno: '',
        ojoIzquierdoCantoExterno: '',
        ojoDerechoCantoInterno: '',
        ojoIzquierdoCantoInterno: '',
        ojoDerechoPuntosLagrimales: '',
        ojoIzquierdoPuntosLagrimales: '',
        ojoDerechoConjuntivaTarsal: '',
        ojoIzquierdoConjuntivaTarsal: '',
        ojoDerechoConjuntivaBulbar: '',
        ojoIzquierdoConjuntivaBulbar: '',
        ojoDerechoFondoSaco: '',
        ojoIzquierdoFondoSaco: '',
        ojoDerechoLimbo: '',
        ojoIzquierdoLimbo: '',
        ojoDerechoCorneaBiomicroscopia: '',
        ojoIzquierdoCorneaBiomicroscopia: '',
        ojoDerechoCamaraAnterior: '',
        ojoIzquierdoCamaraAnterior: '',
        ojoDerechoIris: '',
        ojoIzquierdoIris: '',
        ojoDerechoCristalino: '',
        ojoIzquierdoCristalino: '',
        ojoDerechoImagenID: null,
        ojoIzquierdoImagenID: null,
        ojoDerechoImagenID2: null,
        ojoIzquierdoImagenID2: null,
        ojoDerechoImagenID3: null,
        ojoIzquierdoImagenID3: null
      },
      
      // Detección de Alteraciones - Oftalmoscopía
      oftalmoscopia: {
        ojoDerechoPapila: '',
        ojoIzquierdoPapila: '',
        ojoDerechoExcavacion: '',
        ojoIzquierdoExcavacion: '',
        ojoDerechoRadio: '',
        ojoIzquierdoRadio: '',
        ojoDerechoProfundidad: '',
        ojoIzquierdoProfundidad: '',
        ojoDerechoVasos: '',
        ojoIzquierdoVasos: '',
        ojoDerechoRELAV: '',
        ojoIzquierdoRELAV: '',
        ojoDerechoMacula: '',
        ojoIzquierdoMacula: '',
        ojoDerechoReflejo: '',
        ojoIzquierdoReflejo: '',
        ojoDerechoRetinaPeriferica: '',
        ojoIzquierdoRetinaPeriferica: '',
        ojoDerechoISNT: '',
        ojoIzquierdoISNT: '',
        ojoDerechoImagenID: null,
        ojoIzquierdoImagenID: null
      },
      
      // Diagnóstico
      diagnostico: {
        ojoDerechoRefractivo: '',
        ojoIzquierdoRefractivo: '',
        ojoDerechoPatologico: '',
        ojoIzquierdoPatologico: '',
        binocular: '',
        sensorial: ''
      },
      
      // Plan de Tratamiento
      planTratamiento: {
        descripcion: ''
      },
      
      // Pronóstico
      pronostico: {
        descripcion: ''
      },
      
      // Recomendaciones
      recomendaciones: {
        descripcion: ''
      },
      
      // Receta Final
      recetaFinal: {
        ojoDerechoEsfera: '',
        ojoDerechoCilindro: '',
        ojoDerechoEje: null,
        ojoDerechoPrisma: '',
        ojoDerechoEjePrisma: null,
        ojoIzquierdoEsfera: '',
        ojoIzquierdoCilindro: '',
        ojoIzquierdoEje: null,
        ojoIzquierdoPrisma: '',
        ojoIzquierdoEjePrisma: null,
        tratamiento: '',
        tipoID: null,
        dip: '',
        add: '',
        material: '',
        observaciones: ''
      }
    }
  };

  return res.status(200).json({
    status: 'success',
    message: 'Plantilla de historia clínica generada exitosamente',
    data: plantilla
  });
})


