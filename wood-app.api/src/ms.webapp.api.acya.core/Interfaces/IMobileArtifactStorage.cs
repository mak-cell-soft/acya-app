using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.core.Interfaces
{
    /// <summary>
    /// Storage abstraction for private mobile application artifacts.
    /// Ensures binaries are never stored in the database and never exposed publicly.
    /// </summary>
    public interface IMobileArtifactStorage
    {
        /// <summary>
        /// Retrieves a read stream for a stored artifact.
        /// </summary>
        Task<Stream?> GetArtifactStreamAsync(string artifactPath, CancellationToken cancellationToken = default);

        /// <summary>
        /// Stores an artifact file in the private repository and returns its relative path.
        /// </summary>
        Task<string> SaveArtifactAsync(string tenantId, int buildNumber, string fileName, Stream content, CancellationToken cancellationToken = default);

        /// <summary>
        /// Checks if an artifact exists in private storage.
        /// </summary>
        Task<bool> ArtifactExistsAsync(string artifactPath, CancellationToken cancellationToken = default);

        /// <summary>
        /// Returns the size in bytes of the artifact.
        /// </summary>
        Task<long> GetArtifactSizeAsync(string artifactPath, CancellationToken cancellationToken = default);

        /// <summary>
        /// Deletes an artifact from private storage.
        /// </summary>
        Task DeleteArtifactAsync(string artifactPath, CancellationToken cancellationToken = default);
    }
}
