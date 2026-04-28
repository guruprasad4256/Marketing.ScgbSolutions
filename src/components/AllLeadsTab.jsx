import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const ALL_VALUE = '__all__';

const AllLeadsTab = ({ 
  paginatedData, filters, setFilters, uniqueValues, isLoading, 
  itemsPerPage, setItemsPerPage, currentPage, setCurrentPage, 
  totalPages, selectedLeads, setSelectedLeads, toggleSelectAllOnPage, filteredLength 
}) => {
  return (
    <div className="space-y-4">
      {/* 1. FILTER CONTROLS */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Filters</CardTitle>
            </div>
            {Object.values(filters).some(Boolean) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setFilters({search:'', city:'', state:'', legalStatus:'', turnover:''})} 
                className="text-xs gap-1"
              >
                <X className="h-3 w-3" /> Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search leads..." 
                className="pl-9" 
                value={filters.search} 
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} 
              />
            </div>
            
            <Select value={filters.city || ALL_VALUE} onValueChange={v => setFilters(p=>({...p, city: v===ALL_VALUE?'':v}))}>
              <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All Cities</SelectItem>
                {uniqueValues.cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.state || ALL_VALUE} onValueChange={v => setFilters(p=>({...p, state: v===ALL_VALUE?'':v}))}>
              <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All States</SelectItem>
                {uniqueValues.states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.legalStatus || ALL_VALUE} onValueChange={v => setFilters(p=>({...p, legalStatus: v===ALL_VALUE?'':v}))}>
              <SelectTrigger><SelectValue placeholder="Legal Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
                {uniqueValues.legalStatuses.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.turnover || ALL_VALUE} onValueChange={v => setFilters(p=>({...p, turnover: v===ALL_VALUE?'':v}))}>
              <SelectTrigger><SelectValue placeholder="Turnover" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All Turnovers</SelectItem>
                {uniqueValues.turnovers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 2. MAIN DATA TABLE */}
      <Card className="overflow-hidden border shadow-md bg-white">
        <CardHeader className="py-3 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm font-medium text-slate-500">
            Displaying {Math.min(filteredLength, (currentPage-1)*itemsPerPage + 1)}-{Math.min(filteredLength, currentPage*itemsPerPage)} of {filteredLength}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 w-20 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Page:</span>
                <Select value={currentPage.toString()} onValueChange={(v) => setCurrentPage(Number(v))}>
                  <SelectTrigger className="h-8 w-20 text-xs bg-white font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] uppercase font-bold text-slate-400">of {totalPages || 1}</span>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1800px]">
              <TableHeader>
                <TableRow className="bg-slate-50 text-xs">
                  <TableHead className="w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="cursor-pointer" 
                      onChange={toggleSelectAllOnPage} 
                      checked={paginatedData.length > 0 && paginatedData.every(l => selectedLeads.includes(l.id))} 
                    />
                  </TableHead>
                  <TableHead className="font-bold text-slate-700">Company Name</TableHead>
                  <TableHead className="font-bold text-slate-700">Address</TableHead>
                  <TableHead className="font-bold text-slate-700">City</TableHead>
                  <TableHead className="font-bold text-slate-700">State</TableHead>
                  <TableHead className="font-bold text-slate-700">Email ID</TableHead>
                  <TableHead className="font-bold text-slate-700">Mobile 1</TableHead>
                  <TableHead className="font-bold text-slate-700">Mobile 2</TableHead>
                  <TableHead className="font-bold text-slate-700">Mobile 3</TableHead>
                  <TableHead className="font-bold text-slate-700">Legal Status</TableHead>
                  <TableHead className="font-bold text-slate-700">Contact Person</TableHead>
                  <TableHead className="font-bold text-slate-700">Turnover</TableHead>
                  <TableHead className="font-bold text-slate-700">GST Number</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-20 text-muted-foreground">
                      <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-500" />
                      Fetching intelligence from Google Sheets...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-20 text-muted-foreground">
                      No leads found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map(contact => (
                    <TableRow key={contact.id} className="hover:bg-slate-50/50 transition-colors border-b last:border-none text-xs">
                      <TableCell className="text-center">
                        <input 
                          type="checkbox" 
                          className="cursor-pointer" 
                          checked={selectedLeads.includes(contact.id)} 
                          onChange={() => setSelectedLeads(prev => 
                            prev.includes(contact.id) ? prev.filter(x => x !== contact.id) : [...prev, contact.id]
                          )} 
                        />
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">{contact.companyName}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-slate-500" title={contact.address}>{contact.address || '-'}</TableCell>
                      <TableCell>{contact.city || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal bg-slate-50 whitespace-nowrap">{contact.state || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="text-blue-600 font-medium">{contact.email}</TableCell>
                      <TableCell className="font-mono">{contact.mobile1 || '-'}</TableCell>
                      <TableCell className="font-mono text-slate-400">{contact.mobile2 || '-'}</TableCell>
                      <TableCell className="font-mono text-slate-400">{contact.mobile3 || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap italic text-slate-600">{contact.legalStatus || '-'}</TableCell>
                      <TableCell className="font-medium text-slate-700">{contact.contactPerson || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{contact.turnover || '-'}</TableCell>
                      <TableCell className="font-mono font-bold text-slate-900">{contact.gstNumber || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllLeadsTab;