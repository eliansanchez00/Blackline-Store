import { config } from 'dotenv'; // Cargar el .env
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, SlashCommandBuilder, PermissionFlagsBits, ChannelType, Routes, REST, AttachmentBuilder } from 'discord.js'; // Importando discord.js
import fs from 'fs'; // Importando fs

config(); // Cargar el .env

const token = process.env.DISCORD_TOKEN;

const noop = () => {}; // Función vacía para evitar ciertos errores

process.on("unhandledRejection", (err) => {
  console.log("⚠️ Error controlado (Promise):", err?.message);
});

process.on("uncaughtException", (err) => {
  console.log("⚠️ Error controlado (Exception):", err?.message);
});

process.on("multipleResolves", noop);
process.removeAllListeners("multipleResolves");

process.env.NODE_NO_WARNINGS = "1";

// ======================= LIMPIEZA DE CONSOLA =======================
const originalError = console.error;
console.error = (msg, ...args) => {
  const text = typeof msg === "string" ? msg : msg?.message;

  if (
    text?.includes?.("DeprecationWarning") ||
    text?.includes?.("AbortError") ||
    text?.includes?.("WebSocketShard")
  ) return;

  originalError(msg, ...args);
};

const crearEmbed = () => {
  return new EmbedBuilder()
    .setFooter({ text: "Bot by: Eliann.lua." })
    .setTimestamp();
};

// Configuración del cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Cambiá 'assert' por 'with'
import configJson from './config.json' with { type: 'json' };

const ticketActivity = new Map();
const ticketDonacionRespondido = new Map();
const ticketAutoRespondido = new Map();
const giveaways = new Map();

const IMG = "https://i.postimg.cc/Bn6gX6Ls/F9F37C29-1F1A-4353-B1A7-DF8FA7CB2445.png";

// Verifica si el miembro tiene alguno de los roles de staff
const hasStaff = (member) =>
  configJson.roles_staff?.some(roleId => member.roles.cache.has(roleId));

const commands = [
  new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("Enviar panel de tickets")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("sugerencia")
    .setDescription("Crear una sugerencia")
    .addStringOption(o => o.setName("texto").setDescription("Tu sugerencia").setRequired(true)),

  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Enviar un embed")
    .addStringOption(o => o.setName("mensaje").setDescription("Mensaje").setRequired(true))
    .addStringOption(o => o.setName("titulo").setDescription("Título").setRequired(false))
    .addStringOption(o => o.setName("menciones").setDescription("Menciones").setRequired(false)),

  new SlashCommandBuilder().setName("metodos").setDescription("Ver métodos de pago"),
  new SlashCommandBuilder().setName("donaciones").setDescription("Información sobre donaciones"),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banear usuario")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario").setRequired(true))
    .addStringOption(o => o.setName("razon").setDescription("Razón").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulsar usuario")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario").setRequired(true))
    .addStringOption(o => o.setName("razon").setDescription("Razón").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Aislar usuario")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario").setRequired(true))
    .addIntegerOption(o => o.setName("minutos").setDescription("Minutos").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Quitar aislamiento")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("sorteo")
    .setDescription("Crear sorteo")
    .addStringOption(o => o.setName("premio").setDescription("Premio").setRequired(true))
    .addIntegerOption(o => o.setName("ganadores").setDescription("Cantidad de ganadores").setRequired(true))
    .addIntegerOption(o => o.setName("minutos").setDescription("Duración en minutos").setRequired(true))
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

try {
  await rest.put(
    Routes.applicationGuildCommands(configJson.clientId, configJson.guildId),
    { body: commands.map(c => c.toJSON()) }
  );
  console.log("✅ Comandos registrados correctamente.");
} catch (error) {
  console.error("❌ Error al registrar comandos:", error);
}

// Inicializa el cliente de Discord
client.once("ready", () => {
  console.log(`✅ Blackline Store iniciado como ${client.user.tag}`);
  client.user.setActivity("Blackline Store | Tickets", { type: 3 });
});

// Al agregar un nuevo miembro

// Manejo de interacciones (comandos)
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;

      if (!["sugerencia", "ticketpanel"].includes(cmd) && !hasStaff(interaction.member)) {
        return interaction.reply({ content: "❌ No tenés permiso para usar este comando.", ephemeral: true });
      }

      // Comando de sugerencia
      if (cmd === "sugerencia") {
        const texto = interaction.options.getString("texto", true);
        const canal = interaction.guild.channels.cache.get(configJson.canal_sugerencias);

        if (!canal) return interaction.reply({ content: "⚠️ Canal de sugerencias no configurado.", ephemeral: true });

        const embed = crearEmbed()
          .setColor("#00a884")
          .setTitle("💡 Nueva sugerencia")
          .addFields(
            { name: "Usuario", value: `${interaction.user}`, inline: true },
            { name: "Sugerencia", value: texto }
          )
          .setTimestamp();

        const msg = await canal.send({ embeds: [embed] });
        await msg.react("✅");
        await msg.react("❌");

        return interaction.reply({ content: "✅ Sugerencia enviada correctamente.", ephemeral: true });
      }

      // Comando para enviar un embed
      if (cmd === "embed") {
        const mensaje = interaction.options.getString("mensaje", true);
        const titulo = interaction.options.getString("titulo");
        const menciones = interaction.options.getString("menciones");

        const embed = crearEmbed()
          .setColor("#ff0000")
          .setDescription(mensaje)
          .setFooter({ text: `Bot by: Eliann.lua. | Publicado por ${interaction.user.tag}` })
          .setTimestamp();

        if (titulo) embed.setTitle(`📢 ${titulo.toUpperCase()} 📢`);

        await interaction.channel.send({ content: menciones || null, embeds: [embed] });
        return interaction.reply({ content: "✅ Embed enviado.", ephemeral: true });
      }

if (cmd === "ticketpanel") {
  const embed = crearEmbed()
    .setColor("#2b2d31")
    .setTitle("🎫 Blackline Store | Tickets")
    .setDescription("Seleccioná una categoría para abrir un ticket:\n\n⚡ **Ropa**\n💜 **Boost**\n🤝 **Partner**\n🤖 **Bots**\n🎥 **Streamer**\n🚗 **Autos**");

  // Fila 1 con 5 botones
const row1 = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId("ropa_ticket")
      .setLabel("Ropa")
      .setEmoji("⚡") // Emoji para "Ropa"
      .setStyle(ButtonStyle.Secondary),  // Estilo gris
    new ButtonBuilder()
      .setCustomId("boost_ticket")
      .setLabel("Boost")
      .setEmoji("💜") // Emoji para "Boost"
      .setStyle(ButtonStyle.Secondary),  // Estilo gris
    new ButtonBuilder()
      .setCustomId("partner_ticket")
      .setLabel("Partner")
      .setEmoji("🤝") // Emoji para "Partner"
      .setStyle(ButtonStyle.Secondary),  // Estilo gris
    new ButtonBuilder()
      .setCustomId("bots_ticket")
      .setLabel("Bots")
      .setEmoji("🤖") // Emoji para "Bots"
      .setStyle(ButtonStyle.Secondary),  // Estilo gris
    new ButtonBuilder()
      .setCustomId("streamer_ticket")
      .setLabel("Streamer")
      .setEmoji("🎥") // Emoji para "Streamer"
      .setStyle(ButtonStyle.Secondary)  // Estilo gris
  );

// Fila 2 con el botón de "Autos"
const row2 = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId("autos_ticket")
      .setLabel("Autos")
      .setEmoji("🚗") // Emoji para "Autos"
      .setStyle(ButtonStyle.Secondary)  // Estilo gris
  );

await interaction.reply({ embeds: [embed], components: [row1, row2] });
}

if (cmd === "metodos") {
  const embed = crearEmbed()
    .setColor("#000000")
    .setTitle("💳 BLACKLINE STORE | MÉTODOS DE PAGO")
    .setDescription(
`━━━━━━━━━━━━━━━━━━
💸 **MERCADO PAGO**
━━━━━━━━━━━━━━━━━━
Alias: **thiago.martinez.p.mp**  
CVU: **0000003100078092433806**  
Titular: **Thiago Martinez Pinedo**

━━━━━━━━━━━━━━━━━━
🌎 **PAYPAL**
━━━━━━━━━━━━━━━━━━
Usuario: **Thiagomartinez26**

━━━━━━━━━━━━━━━━━━
📌 Enviar comprobante luego del pago
📌 Asegurarse de enviar correctamente el monto`
    )

  return interaction.reply({ embeds: [embed] });
}

if (cmd === "donaciones") {
  const embed = crearEmbed()
    .setColor("#000000")
    .setTitle("🎁 BLACKLINE STORE | DONACIONES")
    .setDescription("Seleccioná una categoría para ver los productos:");

  const menu = new StringSelectMenuBuilder()
    .setCustomId("donaciones_select")
    .setPlaceholder("Elegí una categoría...")
    .addOptions([
      {
        label: "Ropa",
        description: "Ver ropa personalizada",
        emoji: "👕",
        value: "ropa"
      },
      {
        label: "Autos",
        description: "Ver mejoras y vehículos",
        emoji: "🚗",
        value: "autos"
      }, // Se cambió el punto por coma aquí
      {
        label: "Bots Personalizados",
        description: "Ver planes de bots para Discord",
        emoji: "🤖",
        value: "donacion_bots"
      } // Nueva opción agregada
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  return interaction.reply({ embeds: [embed], components: [row] });

  return interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)]
  });
}

      if (["ban", "kick", "timeout", "untimeout"].includes(cmd)) {
        const user = interaction.options.getUser("usuario", true);
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: "❌ Usuario no encontrado.", ephemeral: true });

        if (cmd === "ban") {
          const razon = interaction.options.getString("razon") || "Sin razón";
          await member.ban({ reason: razon });
          return interaction.reply(`🔨 ${user.tag} baneado. Razón: ${razon}`);
        }

        if (cmd === "kick") {
          const razon = interaction.options.getString("razon") || "Sin razón";
          await member.kick(razon);
          return interaction.reply(`👢 ${user.tag} expulsado. Razón: ${razon}`);
        }

        if (cmd === "timeout") {
          const mins = interaction.options.getInteger("minutos", true);
          await member.timeout(mins * 60 * 1000);
          return interaction.reply(`⛔ ${user.tag} aislado por ${mins} minutos.`);
        }

        if (cmd === "untimeout") {
          await member.timeout(null);
          return interaction.reply(`✅ Timeout removido para ${user.tag}.`);
        }
      }

      if (cmd === "sorteo") {
        const premio = interaction.options.getString("premio", true);
        const ganadores = interaction.options.getInteger("ganadores", true);
        const minutos = interaction.options.getInteger("minutos", true);
        const fin = Math.floor(Date.now() / 1000) + minutos * 60;
        const participantes = new Set();

        const embed = crearEmbed()
          .setColor("#39FF14")
          .setTitle("✨ NUEVO SORTEO ✨")
          .setDescription("¡Hacé clic en el botón para participar!")
          .addFields(
            { name: "🎁 Premio", value: premio, inline: true },
            { name: "🏆 Ganadores", value: `${ganadores}`, inline: true },
            { name: "⏳ Finaliza", value: `<t:${fin}:R>`, inline: true },
            { name: "👥 Participantes", value: "0", inline: true }
          )
          .setFooter({ text: `Bot by: Eliann.lua. | Iniciado por ${interaction.user.username}` });

        const btn = new ButtonBuilder()
          .setCustomId("join_giveaway")
          .setLabel("Participar")
          .setEmoji("🎉")
          .setStyle(ButtonStyle.Success);

        const msg = await interaction.reply({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(btn)],
          fetchReply: true
        });

        giveaways.set(msg.id, { participantes, premio, ganadores, creador: interaction.user.id });

        const collector = msg.createMessageComponentCollector({ time: minutos * 60 * 1000 });

        collector.on("collect", async (i) => {
          participantes.add(i.user.id);

          const actualizado = EmbedBuilder.from(embed).setFields(
            { name: "🎁 Premio", value: premio, inline: true },
            { name: "🏆 Ganadores", value: `${ganadores}`, inline: true },
            { name: "⏳ Finaliza", value: `<t:${fin}:R>`, inline: true },
            { name: "👥 Participantes", value: `${participantes.size}`, inline: true }
          );

          await msg.edit({ embeds: [actualizado] });
          await i.reply({ content: "🎉 Participación registrada.", ephemeral: true });
        });

        collector.on("end", async () => {
          if (participantes.size === 0) {
            return msg.edit({ content: "❌ Sorteo finalizado sin participantes.", components: [] });
          }

          const arr = Array.from(participantes);
          const winners = arr.sort(() => Math.random() - 0.5).slice(0, ganadores);

          const final = crearEmbed()
            .setColor("#FF4747")
            .setTitle("🎉 ¡SORTEO FINALIZADO! 🎉")
            .setDescription(`Ganadores:\n${winners.map(w => `<@${w}>`).join("\n")}`)
            .setFooter({ text: `Bot by: Eliann.lua. | Sorteo de ${premio}` });

          const reroll = new ButtonBuilder()
            .setCustomId(`reroll_${msg.id}`)
            .setLabel("Reroll")
            .setEmoji("🎲")
            .setStyle(ButtonStyle.Danger);

          await msg.edit({ embeds: [final], components: [new ActionRowBuilder().addComponents(reroll)] });
        });
      }
    }

if (interaction.isButton()) {
if (interaction.customId === "boton_verificar") {
    if (configJson.rol_noverificado) await interaction.member.roles.remove(configJson.rol_noverificado).catch(() => {});
    if (configJson.rol_verificado) await interaction.member.roles.add(configJson.rol_verificado).catch(() => {});
    return interaction.reply({ content: "✅ Verificación completada correctamente.", ephemeral: true });
}

  const ticketCategorias = {
    ropa_ticket: "ropa",
    boost_ticket: "boost",
    partner_ticket: "partner",
    bots_ticket: "bots",
    streamer_ticket: "streamer",
    autos_ticket: "autos"
  };

  if (ticketCategorias[interaction.customId]) {
  const categoria = ticketCategorias[interaction.customId];
  
const categoriasTickets = {
    ropa: configJson.categoria_ropa,
    boost: configJson.categoria_boost,
    partner: configJson.categoria_partner,
    bots: configJson.categoria_bots,
    streamer: configJson.categoria_streamer,
    autos: configJson.categoria_autos
  };

  const user = interaction.user;
  const clean = user.username.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().substring(0, 15);
  const name = `ticket-${categoria}-${clean}`;

  const existente = interaction.guild.channels.cache.find(c => c.name === name);
  if (existente) {
    return interaction.reply({ content: `⚠️ Ya tenés un ticket abierto: <#${existente.id}>`, ephemeral: true });
  }

const canal = await interaction.guild.channels.create({
  name,
  type: ChannelType.GuildText,
  parent: categoriasTickets[categoria],
  topic: `USER:${user.id}`,
  permissionOverwrites: [
    { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
    // CAMBIO AQUÍ: Usar configJson en lugar de config
...configJson.roles_staff.map(r => ({
      id: r,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    }))
  ]
});

  ticketActivity.set(canal.id, { lastActivity: Date.now(), warned: false, userId: user.id });

  const embed = crearEmbed()
    .setColor("#00a884")
    .setTitle("🎟️ Ticket System")
    .setDescription("¡Bienvenido/a! Un miembro del equipo te atenderá a la brevedad.")
    .addFields(
      { name: "👤 Usuario", value: `${user}`, inline: true },
      { name: "📂 Categoría", value: categoria, inline: true }
    );

  const botones = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("cerrar_ticket").setLabel("Cerrar").setEmoji("🔒").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("asumir_ticket").setLabel("Asumir Ticket").setEmoji("📂").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("notificar_usuario").setLabel("Notificar Usuario").setEmoji("📢").setStyle(ButtonStyle.Secondary)
  );

await canal.send({
  content: `${user} ${configJson.roles_staff.map(r => `<@&${r}>`).join(" ")}`,
  embeds: [embed],
  components: [botones]
});

  // **Usamos `interaction.reply()` para responder con el mensaje efímero**
  return interaction.reply({ content: `✅ Ticket creado en <#${canal.id}>.`, ephemeral: true });
}

  if (interaction.customId === "cerrar_ticket") {
    if (!hasStaff(interaction.member)) return interaction.reply({ content: "❌ No tenés permiso.", ephemeral: true });

    await interaction.reply("🗑️ Generando transcript y cerrando ticket...");

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const transcript = messages.reverse().map(m =>
      `[${new Date(m.createdTimestamp).toLocaleString("es-AR")}] ${m.author.tag}: ${m.content || "[Sin texto]"}`
    ).join("\n");

    const fileName = `./transcript_${interaction.channel.id}.txt`;
    fs.writeFileSync(fileName, transcript || "Ticket vacío.");

// Cambiado config por configJson
    const canalLogs = interaction.guild.channels.cache.get(configJson.logs_tickets_channel);
    if (canalLogs) {
      await canalLogs.send({
        embeds: [
          crearEmbed()
            .setColor("#3498db")
            .setTitle("🧾 Transcript del Ticket")
            .setDescription(`**Canal:** ${interaction.channel.name}\n**Cerrado por:** ${interaction.user}`)
        ],
        files: [new AttachmentBuilder(fileName)]
      });
    }

    fs.unlinkSync(fileName);
    return interaction.channel.delete().catch(() => {});
  }

  if (interaction.customId === "asumir_ticket") {
    if (!hasStaff(interaction.member)) return interaction.reply({ content: "❌ No tenés permiso.", ephemeral: true });
    return interaction.reply(`📂 ${interaction.member} asumió el ticket.`);
  }

  if (interaction.customId === "notificar_usuario") {
    if (!hasStaff(interaction.member)) return interaction.reply({ content: "❌ No tenés permiso.", ephemeral: true });

    const userId = interaction.channel.topic?.replace("USER:", "");
    if (!userId) return interaction.reply({ content: "⚠️ No se encontró el usuario del ticket.", ephemeral: true });

    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
      await user.send(`📢 El staff te notificó en tu ticket de **${interaction.guild.name}**: <#${interaction.channel.id}>`).catch(() => {});
    }

    await interaction.channel.send(`📢 <@${userId}> el staff te necesita en este ticket.`);
    return interaction.reply({ content: "✅ Usuario notificado.", ephemeral: true });
  }

  if (interaction.customId.startsWith("reroll_")) {
    const msgId = interaction.customId.replace("reroll_", "");
    const data = giveaways.get(msgId);

    if (!data) return interaction.reply({ content: "❌ No encontré los participantes.", ephemeral: true });
    if (interaction.user.id !== data.creador) return interaction.reply({ content: "❌ Solo quien creó el sorteo puede hacer reroll.", ephemeral: true });

    const arr = Array.from(data.participantes);
    const nuevo = arr[Math.floor(Math.random() * arr.length)];

    return interaction.reply(`🎲 Nuevo ganador: <@${nuevo}>`);
  }
}

if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "donaciones_select") {
      const opcion = interaction.values[0];

      // --- OPCIÓN ROPA ---
      if (opcion === "ropa") {
        const embed = crearEmbed()
          .setTitle("👕 ROPA PERSONALIZADA")
          .setDescription(
            `👕 Remera — $10.000 ARS / $8 USD  
👖 Pantalón — $10.000 ARS / $8 USD  
🦺 Chaleco — $10.000 ARS / $8 USD  

👕+👖 Set completo — $16.000 ARS / $14 USD  

✨ Torso iluminado — $14.000 ARS / $10 USD  
✨🔥 Set iluminado — $22.000 ARS / $16 USD  

━━━━━━━━━━━━━━━━━━
💡 Extras:
Iluminación → $5.000  
Cambios → $3.000  
Género extra → $5.000`
          );

        return interaction.reply({ embeds: [embed] });
      }

      // --- OPCIÓN AUTOS ---
      if (opcion === "autos") {
        const embed = crearEmbed()
          .setTitle("🚗 MODIFICACIONES DE AUTOS")
          .setDescription(
            `⚙️ Handlings — $15.000  
🚀 Handling volador — $15.000  

🛡️ Blindaje común — $22.000  
🚔 Blindaje total — $32.000  
🛞 Blindaje ruedas — $6.000  
💥 Anti-explosivos — $8.000  

🎨 Calcomanías — $13.000  
🌈 Luces RGB — $15.000  
🛞 Rampas — $18.000`
          );

        return interaction.reply({ embeds: [embed] });
      }

      // --- OPCIÓN BOTS (NUEVA) ---
      if (opcion === "donacion_bots") {
        const textoBots = `🚀 **BLACKLINE STORE | BOTS PERSONALIZADOS PARA DISCORD** 🤖✨

¿Querés llevar tu servidor al siguiente nivel? 👀
Creamos bots totalmente **a medida**, adaptados a lo que necesites 💻🔥

━━━━━━━━━━━━━━━━━━
💎 **PLANES DISPONIBLES** 💎
━━━━━━━━━━━━━━━━━━

🔹 **📦 PLAN BÁSICO**
💰 Cliente normal:
• Mensual: $8.000
• Trimestral: $18.000 (único pago cada tres meses)

🌟 Cliente VIP:
• Mensual: $6.000
• Trimestral: $14.000 (único pago cada tres meses)

✅ Funciones personalizadas
✅ Bot listo para usar
✅ Soporte ante errores o fallas

💡 Ideal si buscás algo funcional, estable y efectivo

━━━━━━━━━━━━━━━━━━

🔸 **⚡ PLAN AVANZADO (RECOMENDADO)**
💰 Cliente normal:
• Mensual: $10.000
• Trimestral: $24.000 (único pago cada tres meses)

🌟 Cliente VIP:
• Mensual: $7.000
• Trimestral: $19.000 (único pago cada tres meses)

🔥 Todo lo del plan básico +
🔄 Modificaciones cuando quieras
➕ Nuevas funciones en cualquier momento
🛠️ Soporte prioritario

💡 Ideal si querés un bot en constante evolución

━━━━━━━━━━━━━━━━━━
🧠 **¿QUÉ PODEMOS HACER?**
━━━━━━━━━━━━━━━━━━

🔹 Fichajes (PFA, SAME, facciones, etc.)
🔹 Logs completos (mensajes, voz, acciones)
🔹 Sistemas para mafias (alertas, resúmenes, movimientos)
🔹 Anuncios automáticos (Twitch, Kick, streams) 🎥
🔹 Bienvenida / despedida 👋
🔹 Facturación y gestión 💰
🔹 Moderación automática ⚖️
🔹 Tickets / soporte 📩
🔹 Economía / recompensas 🎮
🔹 Roles automáticos 🎭

✨ Y mucho más… lo que imagines, lo hacemos realidad ✨

━━━━━━━━━━━━━━━━━━

⚡ **BLACKLINE STORE** ⚡`;

        return interaction.reply({
          content: "@everyone",
          embeds: [
            crearEmbed()
              .setColor("#5865F2")
              .setDescription(textoBots)
              .setImage(IMG)
          ],
          ephemeral: false
        });
      }


      }

      if (interaction.customId === "metodos_pago") {
        const datos = {
          mp: "💳 **MercadoPago**\nAlias: **CONFIGURAR_ALIAS**",
          bank: "🏦 **Transferencia Bancaria**\nCBU/CVU: **CONFIGURAR_CBU**",
          paypal: "💲 **PayPal**\nEmail: **CONFIGURAR_PAYPAL**",
          crypto: "🪙 **Cripto**\nWallet: **CONFIGURAR_WALLET**"
        };

        return interaction.reply({ content: datos[interaction.values[0]], ephemeral: true });
      }
    }
  } catch (err) {
    console.error(err);
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ Error interno del bot.", ephemeral: true }).catch(() => {});
    }
  }
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!msg.channel.name?.startsWith("ticket-")) return;

  ticketActivity.set(msg.channel.id, {
    lastActivity: Date.now(),
    warned: false,
    userId: msg.channel.topic?.replace("USER:", "")
  });

  const texto = msg.content.toLowerCase();

  if (!ticketDonacionRespondido.get(msg.channel.id)) {
    const palabras = ["donacion", "donaciones", "pago", "precio", "valor", "costo", "mercadopago", "paypal", "transferencia", "crypto"];
    if (palabras.some(p => texto.includes(p))) {
      ticketDonacionRespondido.set(msg.channel.id, true);
      await msg.channel.send(`📌 <@${msg.author.id}> parece que tu consulta es sobre donaciones. Usá **/donaciones** o esperá a que el staff te atienda.`);
    }
  }

  if (!ticketAutoRespondido.get(msg.channel.id)) {
    const palabrasAuto = ["auto", "vehiculo", "vehículo", "importar", "meter auto", "subir auto"];
    if (palabrasAuto.some(p => texto.includes(p))) {
      ticketAutoRespondido.set(msg.channel.id, true);
      await msg.channel.send(`🚗 <@${msg.author.id}> para consultas de autos, pasá el modelo/link y el staff te responderá con precio.`);
    }
  }
});

setInterval(async () => {
  const ahora = Date.now();
  const DOCE_HORAS = 12 * 60 * 60 * 1000;

  for (const [channelId, data] of ticketActivity.entries()) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      ticketActivity.delete(channelId);
      continue;
    }

    if (!data.warned && ahora - data.lastActivity >= DOCE_HORAS) {
      await channel.send(`⏳ <@${data.userId}> pasaron **12 horas sin actividad**. Respondé si todavía necesitás ayuda.`);
      ticketActivity.set(channelId, { ...data, warned: true });
    }

    if (data.warned && ahora - data.lastActivity >= DOCE_HORAS * 2) {
      await channel.send("🔒 Ticket cerrado automáticamente por inactividad.");
      await channel.delete().catch(() => {});
      ticketActivity.delete(channelId);
    }
  }
}, 5 * 60 * 1000);

client.login(process.env.DISCORD_TOKEN);