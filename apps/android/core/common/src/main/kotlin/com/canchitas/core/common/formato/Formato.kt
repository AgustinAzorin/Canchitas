package com.canchitas.core.common.formato

import java.text.NumberFormat
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.time.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toJavaLocalDateTime
import kotlinx.datetime.toLocalDateTime

/** Toda fecha se muestra en hora de Argentina (RNF-025) y la plata en pesos enteros (RNF-026). */
object Formato {
    val zonaHoraria: TimeZone = TimeZone.of("America/Argentina/Buenos_Aires")
    private val locale: Locale = Locale.forLanguageTag("es-AR")
    private val fechaYHora = DateTimeFormatter.ofPattern("EEE dd/MM '·' HH:mm", locale)

    /** "sáb 10/10 · 23:00" (GUIDELINES, tipografía). */
    fun fechaYHora(instante: Instant): String = instante
        .toLocalDateTime(zonaHoraria)
        .toJavaLocalDateTime()
        .format(fechaYHora)
        .replaceFirst(".", "")

    /** "$ 6.000", sin decimales. */
    fun pesos(monto: Long): String = NumberFormat.getCurrencyInstance(locale).apply {
        maximumFractionDigits = 0
    }.format(monto)
}
