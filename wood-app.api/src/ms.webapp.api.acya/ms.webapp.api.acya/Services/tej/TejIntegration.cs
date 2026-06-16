// ============================================================
// TEJ Integration — Complete C# Implementation
// Covers: XML Models, Builder, Serializer, API Client, Auth
// Based on TEJ cahier des charges XSD + live API discovery
// ============================================================

using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Xml;
using System.Xml.Serialization;
using Microsoft.Extensions.Options;

namespace ms.webapp.api.acya.api.Services.tej;

// ============================================================
// 1. CONFIGURATION
// ============================================================

public class TejConfig
{
    public string TokenEndpoint { get; set; } =
        "https://login-tej.finances.gov.tn/realms/seif/protocol/openid-connect/token";
    public string ApiBase  { get; set; } = "https://api-tej.finances.gov.tn/v0";
    public string ClientId { get; set; } = "seif-app";
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

// ============================================================
// 2. XML MODELS  (mirrors the XSD / cahier des charges)
// ============================================================

/// <summary>Root element of the XML file deposited on TEJ.</summary>
[XmlRoot("DeclarationsRS")]
public class DeclarationsRS
{
    [XmlAttribute("VersionSchema")]
    public string VersionSchema { get; set; } = "1.0";

    [XmlElement("Declarant")]
    public Declarant Declarant { get; set; } = new();

    [XmlElement("ReferenceDeclaration")]
    public ReferenceDeclaration ReferenceDeclaration { get; set; } = new();

    [XmlElement("AjouterCertificats")]
    public AjouterCertificats? AjouterCertificats { get; set; }

    [XmlElement("ModifierCertificats")]
    public ModifierCertificats? ModifierCertificats { get; set; }

    [XmlElement("AnnulerCertificats")]
    public AnnulerCertificats? AnnulerCertificats { get; set; }
}

/// <summary>Identifies the declarant (the company filing the declaration).</summary>
public class Declarant
{
    /// <summary>1=MatriculeFiscal, 2=CIN, 3=CarteSeJour, 4=Passeport, 5=Autre</summary>
    [XmlElement("TypeIdentifiant")]
    public int TypeIdentifiant { get; set; } = 1;

    /// <summary>Matricule fiscal without the key letter (e.g. 0040863P → "0040863P")</summary>
    [XmlElement("Identifiant")]
    public string Identifiant { get; set; } = string.Empty;

    /// <summary>PP = Personne Physique, PM = Personne Morale</summary>
    [XmlElement("CategorieContribuable")]
    public string CategorieContribuable { get; set; } = "PM";
}

/// <summary>Deposit reference (period covered by this file).</summary>
public class ReferenceDeclaration
{
    /// <summary>0 = initial, 1+ = rectificative</summary>
    [XmlElement("ActeDepot")]
    public int ActeDepot { get; set; } = 0;

    [XmlElement("AnneeDepot")]
    public int AnneeDepot { get; set; } = DateTime.Now.Year;

    /// <summary>Month as 2-digit string: "01".."12"</summary>
    [XmlElement("MoisDepot")]
    public string MoisDepot { get; set; } = DateTime.Now.Month.ToString("D2");
}

// ---- Certificate sections ----

public class AjouterCertificats
{
    [XmlElement("Certificat")]
    public List<Certificat> Certificats { get; set; } = new();
}

public class ModifierCertificats
{
    [XmlElement("Certificat")]
    public List<Certificat> Certificats { get; set; } = new();
}

public class AnnulerCertificats
{
    [XmlElement("Certificat")]
    public List<AnnulationCertificat> Certificats { get; set; } = new();
}

// ---- Main Certificate ----

public class Certificat
{
    [XmlElement("Beneficiaire")]
    public Beneficiaire Beneficiaire { get; set; } = new();

    /// <summary>Format: dd/MM/yyyy</summary>
    [XmlElement("DatePayement")]
    public string DatePayement { get; set; } = string.Empty;

    /// <summary>Unique reference of the certificate in the declarant's system.</summary>
    [XmlElement("Ref_certif_chez_declarant")]
    public string RefCertifChezDeclarant { get; set; } = string.Empty;

    [XmlElement("ListeOperations")]
    public ListeOperations ListeOperations { get; set; } = new();

    [XmlElement("TotalPayement")]
    public TotalPayement TotalPayement { get; set; } = new();
}

public class AnnulationCertificat
{
    [XmlElement("Ref_certif_chez_declarant")]
    public string RefCertifChezDeclarant { get; set; } = string.Empty;

    [XmlElement("DatePayement")]
    public string DatePayement { get; set; } = string.Empty;
}

// ---- Beneficiary ----

public class Beneficiaire
{
    [XmlElement("IdTaxpayer")]
    public IdTaxpayer IdTaxpayer { get; set; } = new();

    /// <summary>1 = resident, 0 = non-resident</summary>
    [XmlElement("Resident")]
    public int Resident { get; set; } = 1;

    [XmlElement("NometprenonOuRaisonsociale")]
    public string NomOuRaisonSociale { get; set; } = string.Empty;

    [XmlElement("Adresse")]
    public string Adresse { get; set; } = string.Empty;

    [XmlElement("Activite")]
    public string Activite { get; set; } = string.Empty;

    [XmlElement("InfosContact")]
    public InfosContact? InfosContact { get; set; }

    // Only for non-residents (PP)
    [XmlElement("DateNaissance")]
    public string? DateNaissance { get; set; }
}

public class IdTaxpayer
{
    [XmlElement("MatriculeFiscal")]
    public MatriculeFiscal? MatriculeFiscal { get; set; }

    // Used when beneficiary identified by CIN
    [XmlElement("NumCIN")]
    public string? NumCIN { get; set; }

    // Used when beneficiary identified by passport
    [XmlElement("NumPasseport")]
    public string? NumPasseport { get; set; }
}

public class MatriculeFiscal
{
    /// <summary>1=MatriculeFiscal, 2=CIN, 3=CarteSeJour, 4=Passeport, 5=Autre</summary>
    [XmlElement("TypeIdentifiant")]
    public int TypeIdentifiant { get; set; } = 1;

    [XmlElement("Identifiant")]
    public string Identifiant { get; set; } = string.Empty;

    [XmlElement("CategorieContribuable")]
    public string CategorieContribuable { get; set; } = "PM";
}

public class InfosContact
{
    [XmlElement("AdresseMail")]
    public string? AdresseMail { get; set; }

    [XmlElement("NumTel")]
    public string? NumTel { get; set; }
}

// ---- Operations ----

public class ListeOperations
{
    [XmlElement("Operation")]
    public List<Operation> Operations { get; set; } = new();
}

public class Operation
{
    /// <summary>
    /// TEJ operation type code, e.g. RS7_000002.
    /// Defined in prmRsTvas / operationNomenclatures reference data.
    /// </summary>
    [XmlAttribute("IdTypeOperation")]
    public string IdTypeOperation { get; set; } = string.Empty;

    [XmlElement("AnneeFacturation")]
    public int AnneeFacturation { get; set; } = DateTime.Now.Year;

    /// <summary>1 = client non professionnel (CNPC), 0 = normal</summary>
    [XmlElement("CNPC")]
    public int CNPC { get; set; } = 0;

    /// <summary>1 = prise en charge par le débiteur, 0 = normal</summary>
    [XmlElement("P_Charge")]
    public int P_Charge { get; set; } = 0;

    /// <summary>Amount in millimes (integer). 1 TND = 1000 millimes.</summary>
    [XmlElement("MontantHT")]
    public long MontantHT { get; set; }

    /// <summary>Withholding tax rate as integer percentage (e.g. 1, 3, 5, 10, 15, 20, 25)</summary>
    [XmlElement("TauxRS")]
    public decimal TauxRS { get; set; }

    /// <summary>TVA rate as integer percentage (e.g. 0, 7, 13, 19)</summary>
    [XmlElement("TauxTVA")]
    public decimal TauxTVA { get; set; }

    [XmlElement("MontantTVA")]
    public long MontantTVA { get; set; }

    [XmlElement("MontantTTC")]
    public long MontantTTC { get; set; }

    [XmlElement("MontantRS")]
    public long MontantRS { get; set; }

    [XmlElement("MontantNetServi")]
    public long MontantNetServi { get; set; }

    // Optional — only when operation involves a foreign currency
    [XmlElement("Devise")]
    public string? Devise { get; set; }

    // Optional — taxe additionnelle
    [XmlElement("TaxeAdditionnelle")]
    public long? TaxeAdditionnelle { get; set; }

    [XmlIgnore]
    public bool TaxeAdditionnelleSpecified => TaxeAdditionnelle.HasValue;
}

public class TotalPayement
{
    [XmlElement("TotalMontantHT")]
    public long TotalMontantHT { get; set; }

    [XmlElement("TotalMontantTVA")]
    public long TotalMontantTVA { get; set; }

    [XmlElement("TotalMontantTTC")]
    public long TotalMontantTTC { get; set; }

    [XmlElement("TotalMontantRS")]
    public long TotalMontantRS { get; set; }

    [XmlElement("TotalMontantNetServi")]
    public long TotalMontantNetServi { get; set; }
}

// ============================================================
// 3. XML BUILDER  (fluent API to construct declarations)
// ============================================================

public class DeclarationBuilder
{
    private readonly DeclarationsRS _declaration = new();

    public DeclarationBuilder ForDeclarant(
        string identifiant,
        string categorie = "PM",
        int typeIdentifiant = 1)
    {
        _declaration.Declarant = new Declarant
        {
            Identifiant           = identifiant,
            CategorieContribuable = categorie,
            TypeIdentifiant       = typeIdentifiant
        };
        return this;
    }

    public DeclarationBuilder ForPeriod(int year, int month, int acteDepot = 0)
    {
        _declaration.ReferenceDeclaration = new ReferenceDeclaration
        {
            AnneeDepot = year,
            MoisDepot  = month.ToString("D2"),
            ActeDepot  = acteDepot
        };
        return this;
    }

    public DeclarationBuilder AddCertificate(Action<CertificatBuilder> configure)
    {
        _declaration.AjouterCertificats ??= new AjouterCertificats();
        var builder = new CertificatBuilder();
        configure(builder);
        _declaration.AjouterCertificats.Certificats.Add(builder.Build());
        return this;
    }

    public DeclarationBuilder ModifyCertificate(Action<CertificatBuilder> configure)
    {
        _declaration.ModifierCertificats ??= new ModifierCertificats();
        var builder = new CertificatBuilder();
        configure(builder);
        _declaration.ModifierCertificats.Certificats.Add(builder.Build());
        return this;
    }

    public DeclarationBuilder CancelCertificate(string refCertif, DateTime paymentDate)
    {
        _declaration.AnnulerCertificats ??= new AnnulerCertificats();
        _declaration.AnnulerCertificats.Certificats.Add(new AnnulationCertificat
        {
            RefCertifChezDeclarant = refCertif,
            DatePayement           = paymentDate.ToString("dd/MM/yyyy")
        });
        return this;
    }

    public DeclarationsRS Build() => _declaration;
}

public class CertificatBuilder
{
    private readonly Certificat _cert = new();

    public CertificatBuilder WithBeneficiary(
        string identifiant,
        string nom,
        string adresse,
        string activite,
        string categorieContribuable = "PM",
        int typeIdentifiant          = 1,
        bool resident                = true,
        string? email                = null,
        string? tel                  = null)
    {
        _cert.Beneficiaire = new Beneficiaire
        {
            IdTaxpayer = new IdTaxpayer
            {
                MatriculeFiscal = new MatriculeFiscal
                {
                    Identifiant           = identifiant,
                    CategorieContribuable = categorieContribuable,
                    TypeIdentifiant       = typeIdentifiant
                }
            },
            Resident          = resident ? 1 : 0,
            NomOuRaisonSociale = nom,
            Adresse           = adresse,
            Activite          = activite,
            InfosContact      = (email != null || tel != null) ? new InfosContact
            {
                AdresseMail = email,
                NumTel      = tel
            } : null
        };
        return this;
    }

    public CertificatBuilder WithPayment(DateTime date, string reference)
    {
        _cert.DatePayement           = date.ToString("dd/MM/yyyy");
        _cert.RefCertifChezDeclarant = reference;
        return this;
    }

    public CertificatBuilder AddOperation(
        string idTypeOperation,
        int    anneeFacturation,
        long   montantHT,
        decimal tauxRS,
        decimal tauxTVA,
        long?  providedMontantTVA = null,
        long?  providedMontantTTC = null,
        long?  providedMontantRS = null,
        bool   cnpc    = false,
        bool   pCharge = false)
    {
        // Calculate derived amounts (TEJ requires integer millimes)
        var montantTVA      = providedMontantTVA ?? (long)Math.Round(montantHT * tauxTVA / 100, MidpointRounding.AwayFromZero);
        var montantTTC      = providedMontantTTC ?? (montantHT + montantTVA);
        var montantRS       = providedMontantRS ?? (long)Math.Round(montantTTC * tauxRS / 100, MidpointRounding.AwayFromZero);
        var montantNetServi = montantTTC - montantRS;

        _cert.ListeOperations.Operations.Add(new Operation
        {
            IdTypeOperation  = idTypeOperation,
            AnneeFacturation = anneeFacturation,
            CNPC             = cnpc    ? 1 : 0,
            P_Charge         = pCharge ? 1 : 0,
            MontantHT        = montantHT,
            TauxRS           = tauxRS,
            TauxTVA          = tauxTVA,
            MontantTVA       = montantTVA,
            MontantTTC       = montantTTC,
            MontantRS        = montantRS,
            MontantNetServi  = montantNetServi
        });

        // Recompute totals
        _cert.TotalPayement = new TotalPayement
        {
            TotalMontantHT       = _cert.ListeOperations.Operations.Sum(o => o.MontantHT),
            TotalMontantTVA      = _cert.ListeOperations.Operations.Sum(o => o.MontantTVA),
            TotalMontantTTC      = _cert.ListeOperations.Operations.Sum(o => o.MontantTTC),
            TotalMontantRS       = _cert.ListeOperations.Operations.Sum(o => o.MontantRS),
            TotalMontantNetServi = _cert.ListeOperations.Operations.Sum(o => o.MontantNetServi)
        };
        return this;
    }

    public Certificat Build() => _cert;
}

// ============================================================
// 4. XML SERIALIZER / FILE GENERATOR
// ============================================================

public static class TejXmlSerializer
{
    private sealed class Utf8StringWriter : StringWriter
    {
        public override System.Text.Encoding Encoding => new System.Text.UTF8Encoding(false);
    }

    /// <summary>Serialize a DeclarationsRS to XML string (TEJ format).</summary>
    public static string Serialize(DeclarationsRS declaration)
    {
        var serializer = new XmlSerializer(typeof(DeclarationsRS));
        var settings   = new XmlWriterSettings
        {
            Indent             = true,
            IndentChars        = "  ",
            Encoding           = new System.Text.UTF8Encoding(false), // UTF-8 no BOM
            OmitXmlDeclaration = false
        };

        using var sw     = new Utf8StringWriter();
        using var writer = XmlWriter.Create(sw, settings);

        // Suppress default xmlns:xsi / xmlns:xsd namespaces
        var ns = new XmlSerializerNamespaces();
        ns.Add("", "");

        serializer.Serialize(writer, declaration, ns);
        return sw.ToString();
    }

    /// <summary>Save declaration to a file following TEJ naming convention:
    /// {seq}-{matricule}-{yyyy}-{MM}-{acteDepot}.xml</summary>
    public static async Task<string> SaveToFileAsync(
        DeclarationsRS declaration,
        string outputDirectory,
        int sequenceNumber = 1)
    {
        var d    = declaration.ReferenceDeclaration;
        var mf   = declaration.Declarant.Identifiant;
        var name = $"{sequenceNumber}-{mf}-{d.AnneeDepot}-{d.MoisDepot}-{d.ActeDepot}.xml";
        var path = Path.Combine(outputDirectory, name);

        Directory.CreateDirectory(outputDirectory);
        
        var serializer = new XmlSerializer(typeof(DeclarationsRS));
        var settings   = new XmlWriterSettings
        {
            Indent             = true,
            IndentChars        = "  ",
            Encoding           = new System.Text.UTF8Encoding(false),
            OmitXmlDeclaration = false
        };
        var ns = new XmlSerializerNamespaces();
        ns.Add("", "");

        await using var stream = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None, 4096, true);
        using var writer = XmlWriter.Create(stream, settings);
        serializer.Serialize(writer, declaration, ns);

        return path;
    }

    /// <summary>Deserialize an XML file back to a DeclarationsRS object.</summary>
    public static DeclarationsRS Deserialize(string xmlContent)
    {
        var serializer = new XmlSerializer(typeof(DeclarationsRS));
        using var reader = new StringReader(xmlContent);
        return (DeclarationsRS)serializer.Deserialize(reader)!;
    }

    public static async Task<DeclarationsRS> LoadFromFileAsync(string filePath)
    {
        var xml = await File.ReadAllTextAsync(filePath);
        return Deserialize(xml);
    }
}

// ============================================================
// 5. AUTH SERVICE
// ============================================================

public class TejAuthService
{
    private readonly HttpClient _http;
    private readonly TejConfig  _config;
    private string?  _accessToken;
    private string?  _refreshToken;
    private DateTime _expiry = DateTime.MinValue;

    public TejAuthService(HttpClient http, IOptions<TejConfig> config)
    {
        _http   = http;
        _config = config.Value;
    }

    public async Task<string> GetTokenAsync()
    {
        // Return cached token if still valid (with 30s buffer)
        if (_accessToken != null && DateTime.UtcNow < _expiry)
            return _accessToken;

        // Try refresh first
        if (_refreshToken != null)
        {
            try { return await RefreshAsync(); }
            catch { /* fall through to password grant */ }
        }

        return await LoginAsync();
    }

    private async Task<string> LoginAsync()
    {
        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "password",
            ["client_id"]  = _config.ClientId,
            ["username"]   = _config.Username,
            ["password"]   = _config.Password,
            ["scope"]      = "openid"
        });

        var res = await _http.PostAsync(_config.TokenEndpoint, body);
        res.EnsureSuccessStatusCode();
        return StoreToken(await res.Content.ReadFromJsonAsync<TejTokenResponse>()!);
    }

    private async Task<string> RefreshAsync()
    {
        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"]    = "refresh_token",
            ["client_id"]     = _config.ClientId,
            ["refresh_token"] = _refreshToken!
        });

        var res = await _http.PostAsync(_config.TokenEndpoint, body);
        res.EnsureSuccessStatusCode();
        return StoreToken(await res.Content.ReadFromJsonAsync<TejTokenResponse>()!);
    }

    private string StoreToken(TejTokenResponse token)
    {
        _accessToken  = token.AccessToken;
        _refreshToken = token.RefreshToken;
        _expiry       = DateTime.UtcNow.AddSeconds(token.ExpiresIn - 30);
        return _accessToken;
    }
}

// ============================================================
// 6. API CLIENT  (HATEOAS Spring Data REST)
// ============================================================

public class TejApiClient
{
    private readonly HttpClient     _http;
    private readonly TejAuthService _auth;
    private readonly string         _base;

    public TejApiClient(HttpClient http, TejAuthService auth, IOptions<TejConfig> config)
    {
        _http  = http;
        _auth  = auth;
        _base  = config.Value.ApiBase;
    }

    // ---- Generic helpers ----

    private async Task<T> GetAsync<T>(string path)
    {
        var req = await BuildRequest(HttpMethod.Get, path);
        var res = await _http.SendAsync(req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<T>())!;
    }

    private async Task<HttpRequestMessage> BuildRequest(HttpMethod method, string path)
    {
        var token = await _auth.GetTokenAsync();
        var req   = new HttpRequestMessage(method, $"{_base}/{path}");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return req;
    }

    // ---- Certificates ----

    public Task<TejPagedResponse<TejCertificate>> GetCertificatesAsync(
        int page = 0, int size = 20, string sort = "createdAt,desc")
        => GetAsync<TejPagedResponse<TejCertificate>>(
            $"certificates?page={page}&size={size}&sort={sort}");

    // ---- Batch Files ----

    public Task<TejPagedResponse<TejBatchFile>> GetBatchFilesAsync(
        int page = 0, int size = 20, string sort = "createdAt,desc")
        => GetAsync<TejPagedResponse<TejBatchFile>>(
            $"batchFiles?page={page}&size={size}&sort={sort}");

    /// <summary>
    /// Upload an XML file to TEJ.
    /// The file must conform to the DeclarationsRS XSD schema.
    /// </summary>
    public async Task<TejUploadResult> UploadDeclarationAsync(string xmlFilePath)
    {
        var token   = await _auth.GetTokenAsync();
        var fileBytes = await File.ReadAllBytesAsync(xmlFilePath);
        
        // CRITICAL WAF BYPASS: We MUST fetch the F5 ASM Bot Defense cookies first!
        // We do a GET to the api-tej domain, and our CookieContainer will automatically save the TS cookies.
        try {
            var wafReq = new HttpRequestMessage(HttpMethod.Get, "https://api-tej.finances.gov.tn/v0/taxpayers/search/0011599F");
            wafReq.Headers.Add("Accept", "application/json, text/plain, */*");
            await _http.SendAsync(wafReq);
        } catch { } // Ignore errors, we just want the cookies
        var content = new ByteArrayContent(fileBytes);
        content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/plain");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{_base}/batch-file/validate-xml?origin=ANGULAR&claimId=0")
        {
            Content = content
        };
        
        req.Headers.Add("delegate-object", "{\"selfDelegant\":true,\"isAgent\":false}");
        req.Headers.Add("starttimestamp", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString());
        req.Headers.Add("Origin", "https://tej.finances.gov.tn");
        req.Headers.Add("Referer", "https://tej.finances.gov.tn/");
        req.Headers.Add("Accept", "application/json, text/plain, */*");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        
        // Add full browser headers to bypass F5 Bot Defense
        req.Headers.Add("Accept-Language", "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7");
        req.Headers.Add("Accept-Encoding", "gzip, deflate, br");
        req.Headers.Add("Sec-Fetch-Dest", "empty");
        req.Headers.Add("Sec-Fetch-Mode", "cors");
        req.Headers.Add("Sec-Fetch-Site", "same-site");

        var res  = await _http.SendAsync(req);
        string body = string.Empty;
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            body = await res.Content.ReadAsStringAsync(cts.Token);
        }
        catch (TaskCanceledException)
        {
            body = "[Timeout reading body from server]";
        }

        return new TejUploadResult
        {
            Success    = res.IsSuccessStatusCode,
            StatusCode = (int)res.StatusCode,
            RawResponse = body
        };
    }

    /// <summary>
    /// Build + serialize + upload a declaration in one call.
    /// </summary>
    public async Task<TejUploadResult> UploadDeclarationAsync(
        DeclarationsRS declaration,
        string tempDirectory = "temp")
    {
        var path = await TejXmlSerializer.SaveToFileAsync(declaration, tempDirectory);
        try   { return await UploadDeclarationAsync(path); }
        finally { File.Delete(path); }
    }

    // ---- Benefices (received certificates) ----

    public Task<TejPagedResponse<TejBenefice>> GetBeneficesAsync(
        int page = 0, int size = 20)
        => GetAsync<TejPagedResponse<TejBenefice>>(
            $"benefices?page={page}&size={size}&sort=createdAt,desc");

    // ---- Certificate Operations ----

    public Task<TejPagedResponse<TejCertificateOperation>> GetCertificateOperationsAsync(
        int page = 0, int size = 20)
        => GetAsync<TejPagedResponse<TejCertificateOperation>>(
            $"certificateOperations?page={page}&size={size}");

    // ---- Claims ----

    public Task<TejPagedResponse<TejClaim>> GetClaimsAsync(
        int page = 0, int size = 20)
        => GetAsync<TejPagedResponse<TejClaim>>(
            $"claims?page={page}&size={size}&sort=createdAt,desc");

    // ---- Taxpayers ----

    public Task<TejPagedResponse<TejTaxpayer>> GetTaxpayersAsync(
        int page = 0, int size = 20)
        => GetAsync<TejPagedResponse<TejTaxpayer>>(
            $"taxpayers?page={page}&size={size}");

    public Task<TejTaxpayer> GetTaxpayerByIdentifierAsync(string identifier, string typeCode = "1")
        => GetAsync<TejTaxpayer>(
            $"taxpayers/search/findByIdentifierAndTypeIdentifier_Code?identifier={identifier}&code={typeCode}");

    // ---- Notifications ----

    public Task<TejPagedResponse<TejNotification>> GetNotificationsAsync(
        int page = 0, int size = 20)
        => GetAsync<TejPagedResponse<TejNotification>>(
            $"notifications?page={page}&size={size}&sort=createdAt,desc");

    // ---- Mandates ----

    public Task<TejPagedResponse<JsonElement>> GetMandatesAsync(
        int page = 0, int size = 20)
        => GetAsync<TejPagedResponse<JsonElement>>(
            $"mandates?page={page}&size={size}");

    // ---- Pagination helper ----

    public async Task<List<T>> GetAllPagesAsync<T>(
        Func<int, int, Task<TejPagedResponse<T>>> fetcher,
        int pageSize = 100,
        int maxPages = 50,
        int delayMs  = 150)
    {
        var all  = new List<T>();
        var page = 0;

        while (page < maxPages)
        {
            var result = await fetcher(page, pageSize);
            all.AddRange(result.Items);
            if (page >= result.Page.TotalPages - 1) break;
            page++;
            await Task.Delay(delayMs);
        }

        return all;
    }
}

// ============================================================
// 7. API RESPONSE MODELS  (JSON — from live API)
// ============================================================

public class TejTokenResponse
{
    [JsonPropertyName("access_token")]  public string AccessToken  { get; set; } = string.Empty;
    [JsonPropertyName("refresh_token")] public string RefreshToken { get; set; } = string.Empty;
    [JsonPropertyName("expires_in")]    public int    ExpiresIn    { get; set; }
}

/// <summary>Generic HATEOAS paged response wrapper.</summary>
public class TejPagedResponse<T>
{
    [JsonPropertyName("_embedded")] public Dictionary<string, List<T>>? Embedded { get; set; }
    [JsonPropertyName("_links")]    public Dictionary<string, object>?   Links    { get; set; }
    [JsonPropertyName("page")]      public TejPageInfo                   Page     { get; set; } = new();

    public List<T> Items => Embedded?.Values.FirstOrDefault() ?? new();
}

public class TejPageInfo
{
    [JsonPropertyName("size")]          public int Size          { get; set; }
    [JsonPropertyName("totalElements")] public int TotalElements { get; set; }
    [JsonPropertyName("totalPages")]    public int TotalPages    { get; set; }
    [JsonPropertyName("number")]        public int Number        { get; set; }
}

public class TejCertificate
{
    [JsonPropertyName("uuid")]                public string?  Uuid               { get; set; }
    [JsonPropertyName("referentCertificate")] public string?  ReferentCertificate{ get; set; }
    [JsonPropertyName("paymentDate")]         public string?  PaymentDate        { get; set; }
    [JsonPropertyName("hash")]                public string?  Hash               { get; set; }
    [JsonPropertyName("precedentHash")]       public string?  PrecedentHash      { get; set; }
    [JsonPropertyName("totalPayement")]       public decimal? TotalPayement      { get; set; }
    [JsonPropertyName("createdAt")]           public string?  CreatedAt          { get; set; }
    [JsonPropertyName("updatedAt")]           public string?  UpdatedAt          { get; set; }
}

public class TejBatchFile
{
    [JsonPropertyName("numDepot")]               public string? NumDepot              { get; set; }
    [JsonPropertyName("acteDepot")]              public int     ActeDepot             { get; set; }
    [JsonPropertyName("anneeDepot")]             public int     AnneeDepot            { get; set; }
    [JsonPropertyName("moisDepot")]              public int     MoisDepot             { get; set; }
    [JsonPropertyName("fileName")]               public string? FileName              { get; set; }
    [JsonPropertyName("hash")]                   public string? Hash                  { get; set; }
    [JsonPropertyName("etatDeclaration")]        public string? EtatDeclaration       { get; set; }
    [JsonPropertyName("certificateGenerateType")]public string? CertificateGenerateType { get; set; }
    [JsonPropertyName("createdAt")]              public string? CreatedAt             { get; set; }
    [JsonPropertyName("updatedAt")]              public string? UpdatedAt             { get; set; }
}

public class TejBenefice
{
    [JsonPropertyName("nometprenonOuRaisonsociale")] public string? NomOuRaisonSociale { get; set; }
    [JsonPropertyName("email")]                      public string? Email              { get; set; }
    [JsonPropertyName("phoneNumber")]                public string? PhoneNumber        { get; set; }
    [JsonPropertyName("address")]                    public string? Address            { get; set; }
    [JsonPropertyName("activity")]                   public string? Activity           { get; set; }
    [JsonPropertyName("resident")]                   public bool    Resident           { get; set; }
    [JsonPropertyName("createdAt")]                  public string? CreatedAt          { get; set; }
    [JsonPropertyName("updateAt")]                   public string? UpdateAt           { get; set; }
}

public class TejCertificateOperation
{
    [JsonPropertyName("anneeFacturation")]  public int     AnneeFacturation { get; set; }
    [JsonPropertyName("montantHT")]         public decimal MontantHT        { get; set; }
    [JsonPropertyName("montantTTC")]        public decimal MontantTTC       { get; set; }
    [JsonPropertyName("montantTVA")]        public decimal MontantTVA       { get; set; }
    [JsonPropertyName("tauxRS")]            public decimal TauxRS           { get; set; }
    [JsonPropertyName("montantRS")]         public decimal MontantRS        { get; set; }
    [JsonPropertyName("montantNetServi")]   public decimal MontantNetServi  { get; set; }
    [JsonPropertyName("devise")]            public string? Devise           { get; set; }
    [JsonPropertyName("cnpc")]              public bool    Cnpc             { get; set; }
    [JsonPropertyName("pcharge")]           public bool    Pcharge          { get; set; }
}

public class TejClaim
{
    [JsonPropertyName("uuid")]        public string? Uuid        { get; set; }
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("motif")]       public string? Motif       { get; set; }
    [JsonPropertyName("paymentDate")] public string? PaymentDate { get; set; }
    [JsonPropertyName("createdAt")]   public string? CreatedAt   { get; set; }
    [JsonPropertyName("updateAt")]    public string? UpdateAt    { get; set; }
}

public class TejTaxpayer
{
    [JsonPropertyName("identifier")]                  public string? Identifier        { get; set; }
    [JsonPropertyName("nometprenonOuRaisonsociale")]  public string? NomOuRaisonSociale{ get; set; }
    [JsonPropertyName("taxpayerType")]                public string? TaxpayerType      { get; set; }
    [JsonPropertyName("resident")]                    public bool    Resident          { get; set; }
    [JsonPropertyName("rtaxRegime")]                  public int     TaxRegime         { get; set; }
    [JsonPropertyName("rcodactivP")]                  public int     CodeActivite      { get; set; }
    [JsonPropertyName("createdAt")]                   public string? CreatedAt         { get; set; }
}

public class TejNotification
{
    [JsonPropertyName("id")]                    public long    Id                  { get; set; }
    [JsonPropertyName("subject")]               public string? Subject             { get; set; }
    [JsonPropertyName("destinationKeycloakId")] public string? DestinationKeycloakId { get; set; }
    [JsonPropertyName("vu")]                    public bool    Vu                  { get; set; }
    [JsonPropertyName("createdAt")]             public string? CreatedAt           { get; set; }
}

public class TejUploadResult
{
    public bool   Success     { get; set; }
    public int    StatusCode  { get; set; }
    public string RawResponse { get; set; } = string.Empty;
}

// ============================================================
// 8. USAGE EXAMPLES
// ============================================================

/*

// ── Program.cs / DI setup ──────────────────────────────────
builder.Services.Configure<TejConfig>(builder.Configuration.GetSection("Tej"));
builder.Services.AddHttpClient<TejAuthService>();
builder.Services.AddHttpClient<TejApiClient>();

// ── appsettings.json ──────────────────────────────────────
{
  "Tej": {
    "Username": "YOUR_USERNAME",
    "Password": "YOUR_PASSWORD"
  }
}

// ── Example 1: Build & upload a declaration ───────────────
var declaration = new DeclarationBuilder()
    .ForDeclarant("0040863P", "PM")
    .ForPeriod(2026, 4)
    .AddCertificate(cert => cert
        .WithBeneficiary(
            identifiant : "1448124C",
            nom         : "STE ENNAJMA SARL",
            adresse     : "KM4 HABIB CHEMLI RTE RAOUED 2083",
            activite    : "STATION DE SERVICES",
            email       : "steennajma.2016@gmail.com",
            tel         : "98221409"
        )
        .WithPayment(new DateTime(2026, 4, 23), "202600129")
        .AddOperation(
            idTypeOperation : "RS7_000002",
            anneeFacturation: 2026,
            montantHT       : 979412,
            tauxRS          : 1m,
            tauxTVA         : 19m
        )
    )
    .Build();

// Serialize to XML string
var xml = TejXmlSerializer.Serialize(declaration);

// Or upload directly
var result = await tejApiClient.UploadDeclarationAsync(declaration);
Console.WriteLine(result.Success ? "Uploaded!" : result.RawResponse);

// ── Example 2: Read back from existing XML file ───────────
var loaded = await TejXmlSerializer.LoadFromFileAsync("declaration.xml");
Console.WriteLine($"Declarant: {loaded.Declarant.Identifiant}");
Console.WriteLine($"Certs: {loaded.AjouterCertificats?.Certificats.Count}");

// ── Example 3: Query received certificates ────────────────
var received = await tejApiClient.GetBeneficesAsync(page: 0, size: 50);
foreach (var b in received.Items)
    Console.WriteLine($"{b.NomOuRaisonSociale} — {b.Email}");

// ── Example 4: Get all certificate operations ─────────────
var allOps = await tejApiClient.GetAllPagesAsync(
    tejApiClient.GetCertificateOperationsAsync,
    pageSize: 100,
    maxPages: 10
);
var totalRS = allOps.Sum(o => o.MontantRS);
Console.WriteLine($"Total RS: {totalRS:N0} millimes");

*/
