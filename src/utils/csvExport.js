export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;
  
  const columns = [
    'Nome_completo', 'telefone', 'email', 'profissional',
    'idade_momento_preenchido', 'estado', 'bairro',
    'stage_pipeline', 'agendado_para', 'horario_agendamento',
    'tempo_medio_agendamento_em_horas', 'fez_tratamento_antes',
    'tag_interesse_queixa', 'interesse_ou_queixas',
    'tag_origem', 'origem', 'utm_source',
    'Perfil_lead',
    'lost_reason', 'data_lost_reason', 'lost_reason_category',
    'motivo_Perfil_lead', 'chatguru_chat'
  ];

  const header = columns.join(',');
  const rows = data.map(row =>
    columns.map(col => {
      let val = row[col];
      if (col === 'Perfil_lead' && (val === null || val === undefined || val === '')) {
        val = 'Não Classificado';
      }
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `mrf_pipeline_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// Export gen\u00E9rico: columns = [{ key, label }]. Respeita a ordem/linhas passadas.
export function exportRowsToCSV(data, columns, filename) {
  if (!data || data.length === 0) return;
  const header = columns.map(c => `"${String(c.label).replace(/"/g, '""')}"`).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      if (val === null || val === undefined) return '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `export_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
