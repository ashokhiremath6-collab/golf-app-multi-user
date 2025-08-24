import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ImportHistory() {
  const { toast } = useToast();
  const [importMethod, setImportMethod] = useState("csv");
  const [csvData, setCsvData] = useState("");
  const [autoCreatePlayers, setAutoCreatePlayers] = useState(false);
  const [autoCreateCourses, setAutoCreateCourses] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const importRoundsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/import/rounds", data);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setImportResult(result);
      toast({
        title: "Import Complete",
        description: `Imported ${result.imported} rounds, skipped ${result.skipped}`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Import Failed",
        description: "Failed to import rounds. Please check your data format.",
        variant: "destructive",
      });
    },
  });

  const downloadSampleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/import/sample-csv");
      return response.text();
    },
    onSuccess: (csvContent) => {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample-rounds.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Download Started",
        description: "Sample CSV file is being downloaded",
      });
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description: "Failed to download sample CSV",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!csvData.trim()) {
      toast({
        title: "Error",
        description: "Please enter CSV data",
        variant: "destructive",
      });
      return;
    }

    importRoundsMutation.mutate({
      csvData,
      autoCreatePlayers,
      autoCreateCourses,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvData(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card data-testid="card-import-history">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4" data-testid="text-import-title">
          Import Historical Rounds
        </h3>
        
        <div className="space-y-6">
          {/* Import Method Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Import Method</Label>
            <Select value={importMethod} onValueChange={setImportMethod}>
              <SelectTrigger data-testid="select-import-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv" data-testid="select-method-csv">CSV File Upload</SelectItem>
                <SelectItem value="text" data-testid="select-method-text">Text Entry (Line by Line)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CSV Data Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-700">CSV Data</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadSampleMutation.mutate()}
                disabled={downloadSampleMutation.isPending}
                data-testid="button-download-sample"
              >
                <i className="fas fa-download mr-2"></i>
                {downloadSampleMutation.isPending ? "Downloading..." : "Download Sample"}
              </Button>
            </div>

            {importMethod === "csv" && (
              <div className="mb-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-golf-green transition-colors">
                  <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                  <p className="text-gray-600">
                    Drop CSV file here or{" "}
                    <label className="text-golf-green hover:underline cursor-pointer">
                      browse
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="input-file-upload"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Columns: player_name, course_name, played_on, scores_1-18, course_handicap
                  </p>
                </div>
              </div>
            )}

            <Textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder={
                importMethod === "csv"
                  ? "player_name,course_name,played_on,scores_1,scores_2,scores_3...\nAshok Hiremath,Willingdon Golf Club,2024-12-28,5,4,6,4,5,4,7,3,4,4,5,3,4,4,5,4,6,4,16"
                  : "Enter rounds line by line..."
              }
              rows={8}
              className="font-mono text-sm"
              data-testid="textarea-csv-data"
            />
          </div>

          {/* Import Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-create-players"
                checked={autoCreatePlayers}
                onCheckedChange={setAutoCreatePlayers}
                data-testid="switch-auto-create-players"
              />
              <Label htmlFor="auto-create-players" className="text-sm text-gray-700">
                Auto-create missing players
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-create-courses"
                checked={autoCreateCourses}
                onCheckedChange={setAutoCreateCourses}
                data-testid="switch-auto-create-courses"
              />
              <Label htmlFor="auto-create-courses" className="text-sm text-gray-700">
                Auto-create missing courses
              </Label>
            </div>
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={importRoundsMutation.isPending}
            className="bg-golf-blue hover:bg-blue-700"
            data-testid="button-import-rounds"
          >
            <i className="fas fa-upload mr-2"></i>
            {importRoundsMutation.isPending ? "Importing..." : "Import Rounds"}
          </Button>

          {/* Import Results */}
          {importResult && (
            <div className="mt-6 p-4 border border-gray-200 rounded-lg" data-testid="card-import-results">
              <h4 className="font-medium text-gray-900 mb-3" data-testid="text-import-results-title">
                Import Results
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-golf-green" data-testid="text-imported-count">
                    {importResult.imported}
                  </div>
                  <div className="text-sm text-gray-600">Imported</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600" data-testid="text-skipped-count">
                    {importResult.skipped}
                  </div>
                  <div className="text-sm text-gray-600">Skipped</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600" data-testid="text-errors-count">
                    {importResult.errors?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Errors</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Players Created:</span>
                  <Badge variant="outline" data-testid="badge-players-created">
                    {importResult.summary?.playersCreated || 0}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Courses Created:</span>
                  <Badge variant="outline" data-testid="badge-courses-created">
                    {importResult.summary?.coursesCreated || 0}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Rounds Imported:</span>
                  <Badge variant="outline" data-testid="badge-rounds-imported">
                    {importResult.summary?.roundsImported || 0}
                  </Badge>
                </div>
              </div>

              {/* Errors Display */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4" data-testid="section-import-errors">
                  <h5 className="font-medium text-red-600 mb-2">Errors:</h5>
                  <div className="max-h-40 overflow-y-auto">
                    {importResult.errors.map((error: string, index: number) => (
                      <div key={index} className="text-sm text-red-600 mb-1" data-testid={`error-${index}`}>
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Format Help */}
          <div className="bg-gray-50 rounded-lg p-4" data-testid="section-format-help">
            <h4 className="font-medium text-gray-900 mb-2">CSV Format Requirements</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Header row must include: player_name, course_name, played_on, scores_1 through scores_18, course_handicap</li>
              <li>• Date format: YYYY-MM-DD (e.g., 2024-12-28)</li>
              <li>• Scores must be between 1 and 10</li>
              <li>• Player names and course names must match existing records (unless auto-create is enabled)</li>
              <li>• Course handicap should be the player's handicap at the time of the round</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
